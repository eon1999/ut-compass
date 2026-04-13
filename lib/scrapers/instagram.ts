// Reads from a pre-populated Apify dataset via the Apify REST API.
// Uses native fetch — no apify-client SDK needed, which avoids the
// proxy-agent transitive dependency that breaks in serverless environments.

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const DEFAULT_DATASET_ID = "0htieUNhOGPbc5mvN";

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
  console.log("Pulling from Apify dataset with id:", DEFAULT_DATASET_ID);

  const url = `https://api.apify.com/v2/datasets/${DEFAULT_DATASET_ID}/items?token=${APIFY_TOKEN}`;

  let items: ApifyDatasetItem[];
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Apify API responded with ${res.status} ${res.statusText}`);
    }
    items = (await res.json()) as ApifyDatasetItem[];
  } catch (error) {
    console.error("Error occurred while scraping Instagram:", error);
    throw new Error(
      `Instagram scraping failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log(`Fetched ${items.length} items from Apify dataset.`);

  return items.map((item) => ({
    id: item.id,
    caption: item.caption ?? null,
    altText: item.altText ?? null,
    instagramHandle: item.ownerUsername ?? null,
    error: item.error,
  }));
}
