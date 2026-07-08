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
import { enrichEventData, IncomingEvent } from "@/lib/ml/enrichClient";
import {
  pushEventToFirestore,
  pushOrganizationToFireStore,
} from "@/lib/db/pushToFirestore";
import { db } from "@/lib/db/firebaseAdmin";
import { scrapeInstagramEvents } from "./scrapers/instagram";

const instagramHandlesToScrape = ["txproduct", "txconvergent", "hookemhacks"];

export async function handleHornslinkEventIngest(overwrite = false) {
  // we need to get all organizations first so we can pass their descriptions
  // they should be pulled from firestore

  try {
    // scrape dat thang
    const rawEvents = await scrapeHornsLinkEvents();

    if (rawEvents.length === 0) {
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failedEvents: string[] = [];

    // enrich dat thang
    for (const rawEvent of rawEvents) {
      try {
        const docId = `${rawEvent.id}`;
        if (!overwrite) {
          const existingDoc = await db.collection("events").doc(docId).get();
          if (existingDoc.exists) {
            continue;
          }
        }

        // enrich the event data by calling our ml service
        const incomingEvent: IncomingEvent = {
          ...rawEvent,
          source: "hornslink",
        } as unknown as IncomingEvent; // type assertion to match IncomingEvent type

        const enrichedEvent = await enrichEventData(incomingEvent);
        await pushEventToFirestore(enrichedEvent);
        successCount++;
      } catch (error) {
        failureCount++;
        failedEvents.push(rawEvent.id);
      }
    }
  } catch (error) {
    // Pipeline error
  }
}

export async function handleInstagramEventIngest() {
  let successCount = 0;
  let failureCount = 0;
  const failedEvents: string[] = [];

  try {
    // now for instagram
    // for each event, if it has an instagram handle, we want to scrape it and enrich those events as well
    const instagramEvents = await scrapeInstagramEvents(
      instagramHandlesToScrape,
    );

    for (const instaEvent of instagramEvents) {
      if (instaEvent.error) {
        failureCount++;
        failedEvents.push(instaEvent.id || "unknown");
        continue;
      }

      try {
        // enrich
        const incomingEvent: IncomingEvent = {
          source: "instagram",
          id: instaEvent.id,
          altText: instaEvent.altText || "",
          caption: instaEvent.caption || "",
          instagramHandle: instaEvent.instagramHandle || "",
        };

        const enrichedEvent = await enrichEventData(incomingEvent);

        // push to firestore with a generated ID since we don't have a natural one for Instagram posts

        await pushEventToFirestore(enrichedEvent);
        successCount++;
      } catch (error) {
        failureCount++;
        failedEvents.push(instaEvent.id);
      }
    }
  } catch (error) {
    // Pipeline error
  }
}

export async function handleOrganizationIngest() {
  try {
    // scrape organizations from hornslink
    // orgs change infrequently, we might
    // want to make sure we don't call this too often
    const rawOrgs = await scrapeHornsLinkOrganizations();

    // no need to enrich org data, just push to firestore
    for (const rawOrg of rawOrgs) {
      const existingDoc = await db
        .collection("organizations")
        .doc(`${rawOrg.id}`)
        .get();
      if (existingDoc.exists) {
        continue;
      }
      await pushOrganizationToFireStore({
        ...rawOrg,
        profilePicture: rawOrg.profilePicture ?? "",
      });
    }
  } catch (error) {
    // Pipeline error
  }
}