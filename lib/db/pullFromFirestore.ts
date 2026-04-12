import { db } from "./firebaseAdmin";

export async function getEventsFromFirestore() {
  const snapshot = await db.collection("events").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getOrganizationsFromFirestore() {
  const snapshot = await db.collection("organizations").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function pullOrganizationsFromFirestore(): Promise<
  Record<
    string,
    {
      id: string;
      name: string;
      hornslinkId: string;
      instagram_handle: string | null;
      description: string;
    }
  >
> {
  const orgsSnapshot = await db.collection("organizations").get();
  const organizations: Record<
    string,
    {
      id: string;
      name: string;
      hornslinkId: string;
      instagram_handle: string | null;
      description: string;
    }
  > = {};
  orgsSnapshot.forEach((doc) => {
    const orgData = doc.data();
    // in our record, we should hold all data we have about the org
    // but for now, we just need the description for enriching event data
    // save some space
    // we have access to the id of the organization from event schema
    // so we should key by id for easy lookup
    organizations[orgData.hornslink_id] = {
      id: doc.id,
      name: orgData.name || "Unknown Organization",
      hornslinkId: orgData.hornslink_id,
      instagram_handle: orgData.instagram_handle || null,
      description:
        orgData.descriptionText ||
        orgData.descriptionHtml ||
        "No description available.",
    };
  });
  return organizations;
}
