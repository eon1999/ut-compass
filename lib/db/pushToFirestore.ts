// this file is for setting up connection with firestore
// we'll write to firestore from the event ingestion pipeline after
// enriching the event data with our ml service

// this file should be pretty straightforward
// but we want to make sure events with same id get overwritten instead of duplicated in firestore
// hornslink has has unique id for each event
// but other sources might not so we want to be handle that gracefully

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// initialize firebase app with service account credentials
const serviceAccount = JSON.parse(
  process.env.PRIVATE_FIREBASE_SERVICE_ACCOUNT_KEY || "{}",
);

if (!serviceAccount || !serviceAccount.project_id) {
  throw new Error("Firebase service account credentials are not set properly.");
}

import { getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface EventData {
  id: string;
  content: {
    title: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  [key: string]: string | number | boolean | null | undefined | object;
}

export async function pushToFirestore(eventData: EventData) {
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
      `Event with ID ${eventData.id}, Title: ${eventData.content.title || "Unknown"} has been pushed to Firestore.`,
    );
  } catch (error) {
    console.error(
      `Failed to push event with ID ${eventData.id} to Firestore:`,
      error,
    );
  }
}
