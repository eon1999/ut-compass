// this file is for setting up connection with firestore
// we'll write to firestore from the event ingestion pipeline after
// enriching the event data with our ml service

// this file should be pretty straightforward
// but we want to make sure events with same id get overwritten instead of duplicated in firestore
// hornslink has has unique id for each event
// but other sources might not so we want to be handle that gracefully

import { db } from "./firebaseAdmin";

interface EventData {
  id: string;
  content: {
    title: string;
    [key: string]: string | string[] | number | boolean | null | undefined;
  };
  [key: string]:
    | string
    | string[]
    | number
    | boolean
    | null
    | undefined
    | object;
  organization: {
    name: string;
    id: string;
  };
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
  if (!eventData.id) {
    throw new Error(
      "Event data must have an 'id' field to be pushed to Firestore.",
    );
  }

  try {
    await db
      .collection("events")
      .doc(eventData.id)
      .set(eventData, { merge: true });
    // Use organizationName if available, but optional since title is the only strict requirement for logging here
    console.log(
      `Event with ID ${eventData.id}, Title: ${eventData.content.title || "Unknown"}, Host: ${eventData.organization.name || "Unknown"}, grabbed from: ${eventData.src} has been pushed to Firestore.`,
    );
  } catch (error) {
    console.error(
      `Failed to push event with ID ${eventData.id} to Firestore:`,
      error,
    );
  }
}

// organizations live in a different collection

export async function pushOrganizationToFireStore(orgData: OrganizationData) {
  if (!orgData.id) {
    throw new Error(
      "Organization data must have an 'id' field to be pushed to Firestore.",
    );
  }

  try {
    await db
      .collection("organizations")
      .doc(orgData.id)
      .set(orgData, { merge: true });
    console.log(
      `Organization with ID ${orgData.id}, Name: ${orgData.name} has been pushed to Firestore.`,
    );
  } catch (error) {
    console.error(
      `Failed to push organization with ID ${orgData.id} to Firestore:`,
      error,
    );
  }
}
