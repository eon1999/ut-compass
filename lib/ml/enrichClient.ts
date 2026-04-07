// This file is responsible for enriching event data by calling the OpenRouter API to get categories for the event.
// It will be used in the event ingestion pipeline to enhance the event data before it is stored in the database.

import OpenAI from "openai";
import { z } from "zod";
import { pullOrganizationsFromFirestore } from "@/lib/db/pullFromFirestore";

const MODEL = "arcee-ai/trinity-large-preview:free";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// general event type categories
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

// major group categories
export const MAJOR_CATEGORIES = [
  "computerScience",
  "electricalEngineering",
  "mechanicalEngineering",
  "civilEngineering",
  "chemicalEngineering",
  "aerospaceEngineering",
  "biologyAndPreMed",
  "chemistry",
  "physics",
  "mathematics",
  "psychology",
  "businessAndFinance",
  "economics",
  "communicationsAndMedia",
  "nursing",
] as const;

// zod schemas — nested to match the database schema
const CategoryWeightSchema = z.object({
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

const MajorWeightSchema = z.object({
  computerScience: z.number().min(0).max(1),
  electricalEngineering: z.number().min(0).max(1),
  mechanicalEngineering: z.number().min(0).max(1),
  civilEngineering: z.number().min(0).max(1),
  chemicalEngineering: z.number().min(0).max(1),
  aerospaceEngineering: z.number().min(0).max(1),
  biologyAndPreMed: z.number().min(0).max(1),
  chemistry: z.number().min(0).max(1),
  physics: z.number().min(0).max(1),
  mathematics: z.number().min(0).max(1),
  psychology: z.number().min(0).max(1),
  businessAndFinance: z.number().min(0).max(1),
  economics: z.number().min(0).max(1),
  communicationsAndMedia: z.number().min(0).max(1),
  nursing: z.number().min(0).max(1),
});

const EventWeightSchema = z.object({
  categories: CategoryWeightSchema,
  majors: MajorWeightSchema,
});

// typescript my beloved
export interface IncomingEvent {
  id: string;
  content: {
    title: string;
    descriptionText: string;
    categories: string[];
    [key: string]: string | string[] | number | boolean | null | undefined;
  };
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

  const prompt = `
    You are a university event classifier. Given the following event details, score the event
    against each category from 0 to 1, where 0 is not relevant at all, and 1 is very relevant.
    Multiple categories can be relevant for a single event, so score each category independently based on the event details.
    The major group categories (computerScience, electricalEngineering, etc.) represent how relevant this event
    is to students in those fields of study.
    
    Event Title: ${title}
    Event Description: ${descriptionText}
    Event Organizer: ${organization.name}
    Event Organizer Description: ${organizationDescription}
    Event Reported Categories: ${categories.join(", ")}
    
    Respond only with a JSON object with exactly two top-level keys: "categories" and "majors".
    Each must be an object with float values between 0 and 1.
    "categories" keys: technologyAndEngineering, politicsAndAdvocacy, academicAndResearch, careerAndNetworking,
    artsAndPerformance, music, socialAndCommunity, culturalAndInternational, healthAndWellness,
    sportsAndRecreation, foodAndDrinks, faithAndSpirituality, volunteerAndService, gamingAndEsports.
    "majors" keys: computerScience, electricalEngineering, mechanicalEngineering, civilEngineering, chemicalEngineering,
    aerospaceEngineering, biologyAndPreMed, chemistry, physics, mathematics, psychology,
    businessAndFinance, economics, communicationsAndMedia, nursing.`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from OpenRouter response");
    }

    const weights = EventWeightSchema.parse(JSON.parse(content));

    const enrichedEvent = {
      ...incomingEvent,
      weights: {
        categories: weights.categories,
        majors: weights.majors,
        model: MODEL,
      },
    };

    return enrichedEvent;
  } catch (error) {
    console.error("Error enriching event data:", error);
    throw error;
  }
}
