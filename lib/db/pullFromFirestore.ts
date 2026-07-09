import { db } from "./firebaseAdmin";
import { getLogger } from "@/lib/logger";

const logger = getLogger({ component: "db" });

export async function getEventsFromFirestore() {
  const timer = logger.time("getEventsFromFirestore");
  logger.dbOperation("get_all", "events");

  try {
    const snapshot = await db.collection("events").get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    logger.dbResult("get_all", "events", events.length, 0);
    timer();
    return events;
  } catch (error) {
    timer();
    throw error;
  }
}

export async function getOrganizationsFromFirestore() {
  const timer = logger.time("getOrganizationsFromFirestore");
  logger.dbOperation("get_all", "organizations");

  try {
    const snapshot = await db.collection("organizations").get();
    const orgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    logger.dbResult("get_all", "organizations", orgs.length, 0);
    timer();
    return orgs;
  } catch (error) {
    timer();
    throw error;
  }
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
  const timer = logger.time("pullOrganizationsFromFirestore");
  logger.dbOperation("pull_organizations", "organizations");

  try {
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
    logger.dbResult("pull_organizations", "organizations", Object.keys(organizations).length, 0);
    timer();
    return organizations;
  } catch (error) {
    timer();
    throw error;
  }
}
