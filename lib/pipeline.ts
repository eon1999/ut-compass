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
import { getLogger } from "@/lib/logger";

const logger = getLogger({ component: "pipeline" });
const instagramHandlesToScrape = ["txproduct", "txconvergent", "hookemhacks"];

export async function handleHornslinkEventIngest(overwrite = false) {
  const timer = logger.time("handleHornslinkEventIngest");
  logger.pipelineStep("start", { overwrite, source: "hornslink" });

  try {
    // Scrape events from HornsLink
    logger.pipelineStep("scrape_hornslink_events");
    const scrapeTimer = logger.time("scrapeHornsLinkEvents");
    const rawEvents = await scrapeHornsLinkEvents();
    scrapeTimer();

    logger.info(`Scraped ${rawEvents.length} events from HornsLink`, {
      operation: "scrape",
      source: "hornslink",
      count: rawEvents.length,
    });

    if (rawEvents.length === 0) {
      logger.warn("No events found from HornsLink");
      timer();
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failedEvents: string[] = [];

    // Process each event
    logger.pipelineStep("enrich_and_store_events", { totalEvents: rawEvents.length });

    for (const rawEvent of rawEvents) {
      const eventTimer = logger.time(`process_event_${rawEvent.id}`);
      try {
        const docId = `${rawEvent.id}`;

        if (!overwrite) {
          logger.dbOperation("check_existing", "events", { docId });
          const existingDoc = await db.collection("events").doc(docId).get();
          if (existingDoc.exists) {
            logger.debug(`Event ${docId} already exists, skipping`, { docId, action: "skipped" });
            eventTimer();
            continue;
          }
        }

        // Enrich the event data by calling our ML service
        logger.pipelineStep("enrich_event", { eventId: rawEvent.id });
        const incomingEvent: IncomingEvent = {
          ...rawEvent,
          source: "hornslink",
        } as unknown as IncomingEvent;

        const enrichedEvent = await enrichEventData(incomingEvent);

        // Push to Firestore
        logger.pipelineStep("store_event", { eventId: enrichedEvent.id });
        await pushEventToFirestore(enrichedEvent);
        successCount++;
        logger.info(`Successfully processed event`, {
          eventId: enrichedEvent.id,
          title: 'content' in enrichedEvent
            ? enrichedEvent.content?.title
            : enrichedEvent.extractedDetails?.title ?? "unknown",
          source: "hornslink",
        });
      } catch (error) {
        failureCount++;
        failedEvents.push(rawEvent.id);
        logger.error(`Failed to process event ${rawEvent.id}`, {
          eventId: rawEvent.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        eventTimer();
      }
    }

    logger.pipelineStep("complete", {
      total: rawEvents.length,
      success: successCount,
      failures: failureCount,
      failedEventIds: failedEvents,
    });

    if (failureCount > 0) {
      logger.warn(`Pipeline completed with ${failureCount} failures`, { failureCount, failedEvents });
    } else {
      logger.info(`Pipeline completed successfully`, { successCount });
    }
  } catch (error) {
    logger.fatal(`Pipeline failed with critical error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    timer();
  }
}

export async function handleInstagramEventIngest() {
  const timer = logger.time("handleInstagramEventIngest");
  logger.pipelineStep("start", { source: "instagram" });

  let successCount = 0;
  let failureCount = 0;
  const failedEvents: string[] = [];

  try {
    logger.pipelineStep("scrape_instagram_events", { handles: instagramHandlesToScrape });

    const scrapeTimer = logger.time("scrapeInstagramEvents");
    const instagramEvents = await scrapeInstagramEvents(instagramHandlesToScrape);
    scrapeTimer();

    logger.info(`Scraped ${instagramEvents.length} events from Instagram`, {
      operation: "scrape",
      source: "instagram",
      count: instagramEvents.length,
    });

    logger.pipelineStep("enrich_and_store_events", { totalEvents: instagramEvents.length });

    for (const instaEvent of instagramEvents) {
      const eventTimer = logger.time(`process_instagram_event_${instaEvent.id}`);

      if (instaEvent.error) {
        failureCount++;
        failedEvents.push(instaEvent.id || "unknown");
        logger.warn(`Instagram event has error, skipping`, {
          eventId: instaEvent.id,
          error: instaEvent.error,
        });
        eventTimer();
        continue;
      }

      try {
        logger.pipelineStep("enrich_event", { eventId: instaEvent.id });

        const incomingEvent: IncomingEvent = {
          source: "instagram",
          id: instaEvent.id,
          altText: instaEvent.altText || "",
          caption: instaEvent.caption || "",
          instagramHandle: instaEvent.instagramHandle || "",
        };

        const enrichedEvent = await enrichEventData(incomingEvent);

        logger.pipelineStep("store_event", { eventId: enrichedEvent.id });
        await pushEventToFirestore(enrichedEvent);
        successCount++;

        logger.info(`Successfully processed Instagram event`, {
          eventId: enrichedEvent.id,
          extractedTitle: 'extractedDetails' in enrichedEvent
            ? enrichedEvent.extractedDetails?.title ?? "unknown"
            : "unknown",
          source: "instagram",
        });
      } catch (error) {
        failureCount++;
        failedEvents.push(instaEvent.id);
        logger.error(`Failed to process Instagram event ${instaEvent.id}`, {
          eventId: instaEvent.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        eventTimer();
      }
    }

    logger.pipelineStep("complete", {
      total: instagramEvents.length,
      success: successCount,
      failures: failureCount,
      failedEventIds: failedEvents,
    });

    if (failureCount > 0) {
      logger.warn(`Instagram pipeline completed with ${failureCount} failures`, { failureCount, failedEvents });
    } else {
      logger.info(`Instagram pipeline completed successfully`, { successCount });
    }
  } catch (error) {
    logger.fatal(`Instagram pipeline failed with critical error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    timer();
  }
}

export async function handleOrganizationIngest() {
  const timer = logger.time("handleOrganizationIngest");
  logger.pipelineStep("start", { source: "hornslink", type: "organizations" });

  try {
    logger.pipelineStep("scrape_hornslink_organizations");
    const scrapeTimer = logger.time("scrapeHornsLinkOrganizations");
    const rawOrgs = await scrapeHornsLinkOrganizations();
    scrapeTimer();

    logger.info(`Scraped ${rawOrgs.length} organizations from HornsLink`, {
      operation: "scrape",
      source: "hornslink",
      type: "organizations",
      count: rawOrgs.length,
    });

    logger.pipelineStep("store_organizations", { totalOrgs: rawOrgs.length });

    let successCount = 0;
    let skippedCount = 0;

    for (const rawOrg of rawOrgs) {
      const orgTimer = logger.time(`store_organization_${rawOrg.id}`);
      try {
        const existingDoc = await db
          .collection("organizations")
          .doc(`${rawOrg.id}`)
          .get();

        if (existingDoc.exists) {
          logger.debug(`Organization ${rawOrg.id} already exists, skipping`, { orgId: rawOrg.id, action: "skipped" });
          skippedCount++;
          orgTimer();
          continue;
        }

        logger.pipelineStep("store_organization", { orgId: rawOrg.id, orgName: rawOrg.name });
        await pushOrganizationToFireStore({
          ...rawOrg,
          profilePicture: rawOrg.profilePicture ?? "",
        });
        successCount++;
        logger.info(`Successfully stored organization`, { orgId: rawOrg.id, orgName: rawOrg.name });
      } catch (error) {
        logger.error(`Failed to store organization ${rawOrg.id}`, {
          orgId: rawOrg.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        orgTimer();
      }
    }

    logger.pipelineStep("complete", {
      total: rawOrgs.length,
      success: successCount,
      skipped: skippedCount,
    });

    logger.info(`Organization ingestion completed`, { successCount, skippedCount });
  } catch (error) {
    logger.fatal(`Organization ingestion failed with critical error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    timer();
  }
}