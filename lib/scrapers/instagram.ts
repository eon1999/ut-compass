// we'll use apify API to scrape instagram profiles for two things:
// caption and alt text of the image (if it exists) — both of these are
// super useful for our ml model to understand what the event is about

// we'll have to manually curate a list of instagram profiles to scrape for each event, but since
// organizations change infrequently, this won't be a big deal. we can just update this list every few months or so

import { ApifyClient } from "apify-client";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

const apifyClient = new ApifyClient({
  token: APIFY_TOKEN,
});

const defaultDatasetId = "4lNFCWPdC5N6rVuiB"; // placeholder

export async function scrapeInstagramEvents(instagramHandles: string[]) {
  const input = {
    addParentData: false,
    directUrls: instagramHandles.map(
      (handle) => `https://www.instagram.com/${handle}/`,
    ),
    onlyPostsNewerThan: "2 weeks",
    resultsLimit: 5,
    resultsType: "posts",
    searchLimit: 1,
    searchType: "hashtag",
  };

  try {
    // console.log("Starting Instagram scraping with Apify...");
    console.log("Pulling from Apify dataset with id:", defaultDatasetId);

    const datasetId =
      input.resultsType === "posts" ? defaultDatasetId : "someOtherDatasetId";

    const { items } = await apifyClient.dataset(datasetId).listItems();

    console.log(`Fetched ${items.length} items from Apify dataset.`);

    return items.map((item) => ({
      id: item.id,
      caption: item.caption || null,
      altText: item.altText || null,
      instagramHandle: item.ownerUsername || null,
      error: item.error,
    })) as {
      id: string;
      caption: string | null;
      altText: string | null;
      instagramHandle: string | null;
      error?: string;
    }[];
  } catch (error) {
    console.error("Error occurred while scraping Instagram:", error);

    throw new Error(
      `Instagram scraping failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
