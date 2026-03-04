// This file is responsible for enriching event data by calling the Hugging Face API to get embeddings and categories for the event.
// It will be used in the event ingestion pipeline to enhance the event data before it is stored in the database.

// we're pivoting to chatgpt wrapper since zero-shot seems pretty inconsistent

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { pullOrganizationsFromFirestore } from "@/lib/db/pullFromFirestore";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// define categories
export const EVENT_CATEGORIES = [
  "technologyAndEngineering",
  "politicsAndAdvocacy",
  "academicAndResearch",
  "careerAndNetworking",
  "artsAndPerformance",
  "music",
  "socialAndCommunity",
  "culturalAndInternational",
  "healthAndWellness",
  "sportsAndRecreation",
  "foodAndDrinks",
  "faithAndSpirituality",
  "volunteerAndService",
  "gamingAndEsports",
] as const;

// make event weight schema using zod
const EventWeightSchema = z.object({
  technologyAndEngineering: z.number().min(0).max(1),
  politicsAndAdvocacy: z.number().min(0).max(1),
  academicAndResearch: z.number().min(0).max(1),
  careerAndNetworking: z.number().min(0).max(1),
  artsAndPerformance: z.number().min(0).max(1),
  music: z.number().min(0).max(1),
  socialAndCommunity: z.number().min(0).max(1),
  culturalAndInternational: z.number().min(0).max(1),
  healthAndWellness: z.number().min(0).max(1),
  sportsAndRecreation: z.number().min(0).max(1),
  foodAndDrinks: z.number().min(0).max(1),
  faithAndSpirituality: z.number().min(0).max(1),
  volunteerAndService: z.number().min(0).max(1),
  gamingAndEsports: z.number().min(0).max(1),
});

// typescript my beloved
interface IncomingEvent {
  id: string;
  content: {
    title: string;
    descriptionText: string;
    categories: string[];
    [key: string]: string | string[] | number | boolean | null | undefined;
  }
  organization: {
    name: string;
    id: string;
  };
  [key: string]: string | number | boolean | null | undefined | object;
}

let cachedOrganizations: Record<string, { description: string }> | null = null;

async function getOrganizations(): Promise<
  Record<string, { description: string }>
> {
  if (!cachedOrganizations) {
    // if we don't have cached orgs, pull from firestore
    cachedOrganizations = await pullOrganizationsFromFirestore();
  }
  return cachedOrganizations;
}

export async function enrichEventData(incomingEvent: IncomingEvent) {
  // grab our relevant information
  const { title, descriptionText, categories } = incomingEvent.content;
  const { organization } = incomingEvent;
  const organizations = await getOrganizations();
  
  if (!organization) {
    throw new Error("Organization data is missing from incoming event");
  }
  
  const organizationDescription =
    organizations[organization.id]?.description || "No description available.";

  // cook up some prompt engineering magic
  // we  will pull event organization description from
  const prompt = `
    You are a university event classifier. Given the following event details, score the event
    against each category from 0 to 1, where 0 is not relevant at all, and 1 is very relevant.
    Multiple categories can be relevant for a single event, so score each category independently based on the event details.
    
    Event Title: ${title}
    Event Description: ${descriptionText}
    Event Organizer: ${organization.name}
    Event Organizer Description: ${organizationDescription}
    Event Reported Categories: ${categories.join(", ")}
    
    Be sure to only respond with category weights in JSON format, and do not include any additional text`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: zodResponseFormat(EventWeightSchema, "event_weight"),
    });

    // append the category weights to our event data

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from OpenAI response");
    }

    const weights = EventWeightSchema.parse(JSON.parse(content));

    const enrichedEvent = {
      ...incomingEvent,
      weights: weights,
    };

    return enrichedEvent;
  } catch (error) {
    console.error("Error enriching event data:", error);
    throw error;
  }
}
