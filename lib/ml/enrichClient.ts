// This file is responsible for enriching event data by calling the OpenRouter API to get categories for the event.
// It will be used in the event ingestion pipeline to enhance the event data before it is stored in the database.

import OpenAI from "openai";
import { pullOrganizationsFromFirestore } from "@/lib/db/pullFromFirestore";

const MODEL = "google/gemma-4-31b-it:free";

const CHAT_MAX_RETRIES = 5;
const CHAT_BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as { status?: number; code?: number };
  return o.status === 429 || o.code === 429;
}

function getRetryDelayMs(err: unknown, attempt: number): number {
  const exponential = CHAT_BASE_DELAY_MS * Math.pow(2, attempt);
  if (err && typeof err === "object" && "headers" in err) {
    const headers = (err as { headers?: Headers }).headers;
    const retryAfter = headers?.get?.("retry-after");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return Math.max(exponential, seconds * 1000);
      }
    }
  }
  return exponential;
}

async function createChatCompletionWithRetries(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.Chat.ChatCompletion> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= CHAT_MAX_RETRIES; attempt++) {
    try {
      return await client.chat.completions.create(params);
    } catch (e) {
      lastError = e;
      if (!isRateLimitError(e) || attempt === CHAT_MAX_RETRIES) {
        throw e;
      }
      const delayMs = getRetryDelayMs(e, attempt);
      console.warn(
        `OpenRouter rate limited (429), retry ${attempt + 1}/${CHAT_MAX_RETRIES} after ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}

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

/** Firestore / app org record shape from pullOrganizationsFromFirestore */
type CachedOrg = {
  id: string;
  name: string;
  hornslinkId: string;
  instagram_handle: string | null;
  description: string;
};

/**
 * Map model output to 0–1. Previously we used z.coerce.number().max(1).catch(0):
 * values like 85 (percent) or 9 (1–10 scale) failed max(1) and were replaced with 0.
 */
function normalizeScoreValue(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  const s = String(raw).trim().replace(/%/g, "");
  const n = parseFloat(s);
  if (Number.isNaN(n) || n < 0) return 0;
  if (n <= 1) return n;
  // Likert / "strength out of 10"
  if (n <= 10) return Math.min(1, n / 10);
  // Percentage 0–100
  if (n <= 100) return Math.min(1, n / 100);
  return 1;
}

function camelToSnake(key: string): string {
  return key.replace(/([a-z\d])([A-Z])/g, "$1_$2").toLowerCase();
}

function parseWeightsObject(
  raw: unknown,
  keys: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") {
    for (const k of keys) out[k] = 0;
    return out;
  }
  const obj = raw as Record<string, unknown>;
  const lowerEntries = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    lowerEntries.set(k.toLowerCase().replace(/\s+/g, ""), v);
  }
  for (const key of keys) {
    let rawVal: unknown;
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      rawVal = obj[key];
    } else {
      const snake = camelToSnake(key);
      if (Object.prototype.hasOwnProperty.call(obj, snake)) {
        rawVal = obj[snake];
      } else {
        rawVal = lowerEntries.get(key.toLowerCase());
        if (rawVal === undefined) {
          rawVal = lowerEntries.get(snake.replace(/_/g, ""));
        }
      }
    }
    out[key] = normalizeScoreValue(rawVal);
  }
  return out;
}

/** Models often wrap JSON in result/data/response. */
function unwrapModelJson(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== "object") return {};
  const o = parsed as Record<string, unknown>;
  if ("categories" in o && "majors" in o) return o;
  for (const wrap of ["result", "data", "response", "output", "json"]) {
    const inner = o[wrap];
    if (
      inner &&
      typeof inner === "object" &&
      "categories" in inner &&
      "majors" in inner
    ) {
      return inner as Record<string, unknown>;
    }
  }
  return o;
}

type ExtractedDetails = {
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  description: string | null;
};

function parseExtractedDetails(root: Record<string, unknown>): ExtractedDetails {
  const raw = root.extractedDetails ?? root.extracted_details ?? root.details;
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const str = (k: string): string | null => {
    const v = obj[k];
    if (v === null || v === undefined || v === "") return null;
    return String(v);
  };
  return {
    title: str("title"),
    date: str("date"),
    time: str("time"),
    location: str("location"),
    description: str("description"),
  };
}

function warnIfAllWeightsZero(
  categories: Record<string, number>,
  majors: Record<string, number>,
): void {
  const catSum = Object.values(categories).reduce((a, b) => a + b, 0);
  const majSum = Object.values(majors).reduce((a, b) => a + b, 0);
  if (catSum === 0 && majSum === 0) {
    console.warn(
      "enrichEventData: all category and major weights are 0 after normalization — check model output format.",
    );
  }
}

// typescript my beloved
export type HornsLinkEvent = {
  source: "hornslink";
  id: string; // The Hornslink Event ID
  content: {
    title: string;
    descriptionText: string;
    categories: string[];
    [key: string]: string | string[] | number | boolean | null;
  };
  organization: {
    name: string;
    id: string; // The Hornslink Org ID
  };
};

export type InstagramEvent = {
  source: "instagram";
  id: string;
  altText: string;
  caption: string;
  instagramHandle: string;
};

// now any function accepting IncomingEvent must handle both!
export type IncomingEvent = HornsLinkEvent | InstagramEvent;

let cachedOrganizations: Record<string, CachedOrg> | null = null;
let handleToOrgIdMap: Record<string, string> | null = null;

async function getOrganizations(): Promise<{
  cachedOrganizations: Record<string, CachedOrg>;
  handleToOrgIdMap: Record<string, string>;
}> {
  if (!cachedOrganizations || !handleToOrgIdMap) {
    cachedOrganizations = await pullOrganizationsFromFirestore();
    handleToOrgIdMap = {};

    // Map Instagram handle -> HornsLink id key in cachedOrganizations (Firestore uses instagram_handle)
    for (const [hornslinkKey, org] of Object.entries(cachedOrganizations)) {
      const handle = org.instagram_handle;
      if (handle) {
        const cleanHandle = handle.replace(/^@/, "").toLowerCase();
        handleToOrgIdMap[cleanHandle] = hornslinkKey;
      }
    }
  }
  return { cachedOrganizations, handleToOrgIdMap };
}

export async function enrichEventData(incomingEvent: IncomingEvent) {
  const { cachedOrganizations, handleToOrgIdMap } = await getOrganizations();
  let prompt = "";
  let organizationData: CachedOrg | null = null;

  // for hornslink
  if (incomingEvent.source === "hornslink") {
    const orgId = incomingEvent.organization.id.replace("org_", ""); // remove the "org_" prefix to get the actual HornsLink org ID
    organizationData = cachedOrganizations[orgId];
    if (!organizationData) {
      console.warn("No organization data found for HornsLink event with org ID: " + orgId);
    }


    prompt = `
    You are a university event classifier. Score how well the event matches each category and major.
    Use a number between 0.0 and 1.0 for each score (e.g. 0.85). Do NOT use 0-100 percentages or whole numbers above 1.
    Title: ${incomingEvent.content.title}
    Description: ${incomingEvent.content.descriptionText}
    Organizer: ${organizationData?.name || "Unknown Organization"}
    Organizer Description: ${organizationData?.description || "No description available."}
    
    Respond with exactly two top-level JSON keys: "categories" and "majors". Each value must be an object.
    You MUST use these exact camelCase keys (spell them exactly) under "categories" and "majors", with a numeric score 0.0-1.0 for each:
    
    categories keys: ${EVENT_CATEGORIES.join(", ")}
    majors keys: ${MAJOR_CATEGORIES.join(", ")}
  `;
  }

  // for instagram
  else if (incomingEvent.source === "instagram") {
    const cleanHandle = incomingEvent.instagramHandle
      .replace(/^@/, "")
      .toLowerCase();
    const orgId = handleToOrgIdMap[cleanHandle];
    organizationData = orgId ? cachedOrganizations[orgId] : null;

    if (!organizationData) {
      console.warn(`No Firebase org found for handle @${cleanHandle}`);
      // optionally throw an error here, or use a default standard
    }

    prompt = `
      You are a university event classifier and data extractor.
      Read the unstructured Instagram data and:
      1) Score how well the event matches EACH category and major using a number between 0.0 and 1.0 (e.g. 0.9 for a strong match). Do NOT use 0-100 or integers above 1.
      2) Extract 'title', 'date', 'time', 'location', and 'description' into an object "extractedDetails". Use null when unknown.

      Image OCR Text: ${incomingEvent.altText}
      Post Caption: ${incomingEvent.caption}
      Organizer: ${organizationData?.name || incomingEvent.instagramHandle}
      Organizer Description: ${organizationData?.description || "Unknown"}

      Respond with exactly three top-level keys: "categories", "majors", "extractedDetails".
      Under "categories" and "majors" you MUST use these exact camelCase keys with numeric scores 0.0-1.0:
      categories: ${EVENT_CATEGORIES.join(", ")}
      majors: ${MAJOR_CATEGORIES.join(", ")}
    `;
  }

  // call model (retries with backoff on 429)
  const response = await createChatCompletionWithRetries({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content received from OpenRouter");

  const parsedJson = JSON.parse(content) as unknown;
  const root = unwrapModelJson(parsedJson);
  const categories = parseWeightsObject(root.categories, EVENT_CATEGORIES);
  const majors = parseWeightsObject(root.majors, MAJOR_CATEGORIES);
  warnIfAllWeightsZero(categories, majors);

  if (incomingEvent.source === "instagram") {
    const extractedDetails = parseExtractedDetails(root);
    return {
      ...incomingEvent,
      organizationId: organizationData?.id ?? null,
      extractedDetails,
      weights: {
        categories,
        majors,
        model: MODEL,
      },
    };
  }

  return {
    ...incomingEvent,
    weights: {
      categories,
      majors,
      model: MODEL,
    },
  };
}