// this file is for setting up connection with firestore
// we'll write to firestore from the event ingestion pipeline after
// enriching the event data with our ml service

// this file should be pretty straightforward
// but we want to make sure events with same id get overwritten instead of duplicated in firestore
// hornslink has has unique id for each event
// but other sources might not so we want to be handle that gracefully

import { db } from "./firebaseAdmin";
import { getLogger } from "@/lib/logger";

const logger = getLogger({ component: "db" });

interface EventData {
  id: string;
  source?: string;
  content?: {
    title?: string;
    [key: string]: any;
  };
  extractedDetails?: {
    title?: string | null;
    [key: string]: any;
  };
  organization?: {
    name?: string;
    id?: string;
  };
  organizationId?: string | null;
  [key: string]: any;
}

interface OrganizationData {
  id: string;
  name: string;
  descriptionHtml: string;
  descriptionText: string;
  website: string | null;
  summary: string | null;
  profilePicture: string;
  categoryNames: string[];
}

export async function pushEventToFirestore(eventData: EventData) {
  const timer = logger.time(`pushEventToFirestore_${eventData.id}`);
  logger.dbOperation("push", "events", { eventId: eventData.id, source: eventData.source });

  if (!eventData.id) {
    logger.error("Event data must have an 'id' field to be pushed to Firestore.", { eventData });
    throw new Error(
      "Event data must have an 'id' field to be pushed to Firestore.",
    );
  }

  try {
    await db
      .collection("events")
      .doc(eventData.id)
      .set(eventData, { merge: true });

    let title = "Unknown";
    let host = "Unknown";

    if (eventData.source === "hornslink" && eventData.content) {
      title = eventData.content.title || "Unknown";
    } else if (eventData.source === "instagram" && eventData.extractedDetails) {
      title = eventData.extractedDetails.title || "Unknown";
    }

    if (eventData.organization) {
      host = eventData.organization.name || "Unknown";
    } else if (eventData.organizationId) {
      // Instagram event fallback
      host = `Org ID: ${eventData.organizationId}`;
    }

    logger.dbResult("push", "events", 1, 0, { eventId: eventData.id, title, host, source: eventData.source });
    logger.info(
      `Event with ID ${eventData.id}, Title: ${title}, Host: ${host}, grabbed from: ${eventData.source || "unknown"} has been pushed to Firestore.`,
    );
  } catch (error) {
    logger.error(
      `Failed to push event with ID ${eventData.id} to Firestore:`,
      { eventId: eventData.id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
    );
    throw error;
  } finally {
    timer();
  }
}

// organizations live in a different collection

export async function pushOrganizationToFireStore(orgData: OrganizationData) {
  const timer = logger.time(`pushOrganizationToFireStore_${orgData.id}`);
  logger.dbOperation("push", "organizations", { orgId: orgData.id, orgName: orgData.name });

  if (!orgData.id) {
    logger.error("Organization data must have an 'id' field to be pushed to Firestore.", { orgData });
    throw new Error(
      "Organization data must have an 'id' field to be pushed to Firestore.",
    );
  }

  try {
    await db
      .collection("organizations")
      .doc(orgData.id)
      .set(orgData, { merge: true });
    logger.dbResult("push", "organizations", 1, 0, { orgId: orgData.id, orgName: orgData.name });
    logger.info(
      `Organization with ID ${orgData.id}, Name: ${orgData.name} has been pushed to Firestore.`,
    );
  } catch (error) {
    logger.error(
      `Failed to push organization with ID ${orgData.id} to Firestore:`,
      { orgId: orgData.id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
    );
    throw error;
  } finally {
    timer();
  }
}
