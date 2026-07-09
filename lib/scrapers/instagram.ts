// Reads from a pre-populated Apify dataset via the Apify REST API.
// Uses native fetch — no apify-client SDK needed, which avoids the
// proxy-agent transitive dependency that breaks in serverless environments.

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const DEFAULT_DATASET_ID = "h55ijnUeceFbTTk1R";

import { getLogger } from "@/lib/logger";

const logger = getLogger({ component: "scraper" });

type ApifyDatasetItem = {
  id: string;
  caption?: string | null;
  altText?: string | null;
  ownerUsername?: string | null;
  error?: string;
};

// instagramHandles is accepted for API compatibility but the current
// implementation reads from a fixed pre-populated Apify dataset.
export async function scrapeInstagramEvents(instagramHandles: string[]) {
  void instagramHandles;
  const timer = logger.time("scrapeInstagramEvents");
  logger.scrapeStart("instagram_events", { datasetId: DEFAULT_DATASET_ID });

  console.log("Pulling from Apify dataset with id:", DEFAULT_DATASET_ID);

  const url = `https://api.apify.com/v2/datasets/${DEFAULT_DATASET_ID}/items?token=${APIFY_TOKEN}`;

  let items: ApifyDatasetItem[];
  try {
    logger.apiCall("apify", url);
    const res = await fetch(url);
    if (!res.ok) {
      logger.scrapeError("instagram_events", new Error(`Apify API responded with ${res.status} ${res.statusText}`), { status: res.status });
      throw new Error(`Apify API responded with ${res.status} ${res.statusText}`);
    }
    items = (await res.json()) as ApifyDatasetItem[];
    logger.apiResponse("apify", "dataset/items", res.status, 0, { itemCount: items.length });
  } catch (error) {
    logger.scrapeError("instagram_events", error instanceof Error ? error : new Error(String(error)));
    throw new Error(
      `Instagram scraping failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    timer();
  }

  logger.scrapeComplete("instagram_events", items.length, 0);
  console.log(`Fetched ${items.length} items from Apify dataset.`);

  return items.map((item) => ({
    id: item.id,
    caption: item.caption ?? null,
    altText: item.altText ?? null,
    instagramHandle: item.ownerUsername ?? null,
    error: item.error,
  }));
}
