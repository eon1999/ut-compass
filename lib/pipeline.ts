// main orchestration file for event ingestion pipeline
// file is responsible for taking raw event data and processing it
// then finally pushing it to firestore

// steps:
// 1. scrape event data or receive it from an api route
// 2. enrich data by calling our ml service to get embeddings and categories
// 3. write enriched event data to firestore

import {
  scrapeHornsLinkEvents,
  scrapeHornsLinkOrganizations,
} from "@/lib/scrapers/hornslink";
import { enrichEventData } from "@/lib/ml/enrichClient";
import {
  pushEventToFirestore,
  pushOrganizationToFireStore,
} from "@/lib/db/pushToFirestore";
import { db } from "@/lib/db/firebaseAdmin";

export async function handleEventIngest() {
  console.log("Starting event ingestion pipeline...");

  // we need to get all organizations first so we can pass their descriptions
  // they should be pulled from firestore

  try {
    // scrape dat thang
    const rawEvents = await scrapeHornsLinkEvents();
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
        const existingDoc = await db.collection("events").doc(`evt_${rawEvent.id}`).get();
        if (existingDoc.exists) {
          console.log(`Event with ID evt_${rawEvent.id} already exists. Skipping enrichment and Firestore push.`);
          continue;
        }
        // enrich the event data by calling our ml service
        const enrichedEvent = await enrichEventData(rawEvent);
        await pushEventToFirestore(enrichedEvent);
        successCount++;
      } catch (error) {
        failureCount++;
        failedEvents.push(rawEvent.id);
        console.error(`Failed to process event with ID ${rawEvent.id}:`, error);
      }
    }

    console.log(`Pipeline completed: ${successCount} successes, ${failureCount} failures.
Failed events: ${failedEvents.join(", ")}`);
  } catch (error) {
    console.error("Error in event ingestion pipeline:", error);
  }
}

export async function handleOrganizationIngest() {
  console.log("Starting organization ingestion pipeline...");

  try {
    // scrape organizations from hornslink
    // orgs change infrequently, we might
    // want to make sure we don't call this too often
    const rawOrgs = await scrapeHornsLinkOrganizations();
    console.log(`Scraped ${rawOrgs.length} organizations from HornsLink.`);

    // no need to enrich org data, just push to firestore
    for (const rawOrg of rawOrgs) {
      const existingDoc = await db.collection("organizations").doc(`org_${rawOrg.id}`).get();
      if (existingDoc.exists) {
        console.log(`Organization with ID org_${rawOrg.id} already exists. Skipping Firestore push.`);
        continue;
      }
      await pushOrganizationToFireStore(rawOrg);
    }
  } catch (error) {
    console.error("Error in organization ingestion pipeline:", error);
  }
}
