// main orchestration file for event ingestion pipeline
// file is responsible for taking raw event data and processing it
// then finally pushing it to firestore

// steps:
// 1. scrape event data or receive it from an api route
// 2. enrich data by calling our ml service to get embeddings and categories
// 3. write enriched event data to firestore

import { scrapeHornsLink } from "@/lib/scrapers/hornslink";
import { enrichEventData } from "@/lib/ml/enrichClient";
import { pushToFirestore } from "@/lib/db/pushToFirestore";

export async function handleEventIngest() {
  console.log("Starting event ingestion pipeline...");

  try {
    // scrape dat thang
    const rawEvents = await scrapeHornsLink();
    console.log(`Scraped ${rawEvents.length} events from HornsLink.`);

    if (rawEvents.length === 0) {
      console.warn("No events scraped. Ending pipeline.");
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failedEvents: string[] = [];

    // enrich dat thang
    for (const rawEvent of rawEvents) {
        try {
            const enrichedEvent = await enrichEventData(rawEvent);
            await pushToFirestore(enrichedEvent);
            successCount++;
        } catch (error) {
            failureCount++;
            failedEvents.push(rawEvent.id);
            console.error(`Failed to process event with ID ${rawEvent.id}:`, error);
        }
    }

    console.log(`Pipeline completed: ${successCount} successes, ${failureCount} failures.\n
        Failed events attached below:\n${failedEvents.join("\n")}`);
  } catch (error) {
    console.error("Error in event ingestion pipeline:", error);
  }
}
