import { db } from "./firebaseAdmin";

/**
 * Deletes events from the events collection whose endTime has already passed.
 * Intended to run via cron (e.g. twice weekly) alongside the event ingestion pipeline.
 */
export async function cleanExpiredEvents(): Promise<{ deleted: number }> {
  const eventsRef = db.collection("events");

  // ISO 8601 strings are lexicographically sortable; events with endTime before now have ended
  const cutoff = new Date().toISOString();

  const snapshot = await eventsRef
    .where("content.endTime", "<", cutoff)
    .get();

  if (snapshot.empty) {
    console.log("No expired events to delete.");
    return { deleted: 0 };
  }

  // Firestore batches support max 500 operations
  const BATCH_SIZE = 500;
  const docs = snapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);

    for (const doc of chunk) {
      batch.delete(doc.ref);
      deleted++;
    }

    await batch.commit();
  }

  console.log(`Cleaned ${deleted} expired event(s) from Firestore.`);
  return { deleted };
}
