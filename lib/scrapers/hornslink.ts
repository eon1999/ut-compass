import {fetch as undiciFetch, ProxyAgent} from "undici";
import {FormattedEvent, RawEvent, RawOrganization} from "../interfaces";
import { getLogger } from "@/lib/logger";

const logger = getLogger({ component: "scraper" });
const proxyAgent = new ProxyAgent(process.env.WEBSHARE_PROXY_URL!);

export async function scrapeHornsLinkEvents() {
  const timer = logger.time("scrapeHornsLinkEvents");
  logger.scrapeStart("hornslink_events");

  try {
    // grab today's date in ISO format to filter events that are upcoming
    // api endpoint ex: https://utexas.campuslabs.com/engage/api/discovery/event/search?endsAfter=2026-03-03T00%3A00%3A00-06%3A00&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=99999&startsBefore=2026-03-10T00%3A00%3A00-06%3A00&query=
    const today = new Date().toISOString();
    const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const numToTake = 99999;
    const hornslinkUrl = `https://utexas.campuslabs.com/engage/api/discovery/event/search?endsAfter=${today}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=${numToTake}&startsBefore=${nextTwoWeeks}&query=`;

    logger.apiCall("hornslink", hornslinkUrl);
    const res = await undiciFetch(hornslinkUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
        "Accept": "application/json",
      },
      dispatcher: proxyAgent
    });

    // make sure the response is ok
    if (!res.ok) {
      logger.scrapeError("hornslink_events", new Error(`Failed to fetch from HornsLink: ${res.statusText}`), { status: res.status });
      throw new Error(`Failed to fetch from HornsLink: ${res.statusText}`);
    }

    // parse the response as JSON
    const data = await res.json() as { value?: RawEvent[] };
    logger.apiResponse("hornslink", "event/search", res.status, 0, { responseSize: JSON.stringify(data).length });
    logger.debug("HornsLink response", { status: res.status, itemCount: data.value?.length || 0 });
    const events = data.value || [];

    // map the raw events to our internal schema
    // clean up any HTML tags from the description and handle missing fields gracefully
    const formattedEvents = events.map((rawEvent: RawEvent) => {
      const cleanDescription = rawEvent.description
        ? rawEvent.description.replace(/<[^>]*>?/gm, "").replace(/&/g, "&")
        : "No description provided.";

      const imageId = rawEvent.imagePath || rawEvent.organizationProfilePicture;

      // return that bad boy
      return {
        id: `evt_${rawEvent.id}`,
        src: "HornsLink",
        content: {
          title: rawEvent.name,
          descriptionHtml: rawEvent.description,
          descriptionText: cleanDescription,
          location: rawEvent.location,
          startTime: rawEvent.startsOn,
          endTime: rawEvent.endsOn,
          theme: rawEvent.theme || "None",
          categories: rawEvent.categoryNames || [],
          benefits: rawEvent.benefitNames || [],
          imageUrl: imageId
            ? `https://se-images.campuslabs.com/clink/images/${imageId}`
            : null,
        },
        organization: {
          name: rawEvent.organizationName,
          id: `org_${rawEvent.organizationId}`
        },
      } as FormattedEvent;
    });

    logger.scrapeComplete("hornslink_events", formattedEvents.length, 0);
    timer();
    return formattedEvents;
  } catch (error) {
    timer();
    throw error;
  }
}

// we also want to scrape hornslink for organizations
// we push these into our database as well

export async function scrapeHornsLinkOrganizations() {
  const timer = logger.time("scrapeHornsLinkOrganizations");
  logger.scrapeStart("hornslink_organizations");

  try {
    const hornslinkUrl = "https://utexas.campuslabs.com/engage/api/discovery/search/organizations?orderBy%5B0%5D=UpperName%20asc&top=99999&filter=&query=&skip=0"
    logger.info("Fetching organizations from HornsLink...", { url: hornslinkUrl });

    logger.apiCall("hornslink", hornslinkUrl);
    const response = await undiciFetch(hornslinkUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
        "Accept": "application/json",
      },
      dispatcher: proxyAgent
    });

    if (!response.ok) {
      logger.scrapeError("hornslink_organizations", new Error(`Failed to fetch organizations from HornsLink: ${response.statusText}`), { status: response.status });
      throw new Error(`Failed to fetch organizations from HornsLink: ${response.statusText}`);
    }

    const data = await response.json() as { value?: RawOrganization[] };
    logger.apiResponse("hornslink", "organization/search", response.status, 0, { responseSize: JSON.stringify(data).length });
    const organizations = data.value || [];

    logger.debug(`Fetched ${organizations.length} organizations from HornsLink`);

    const formattedOrgs = organizations.map((org: RawOrganization) => {
      const descriptionHtml = org.Description || "No description provided.";
      const cleanDescription = descriptionHtml.replace(/<[^>]*>?/gm, "").replace(/&/g, "&");

      // slugify the organization name to create a doc ID for Firestore
      const docId = org.Name
        .toLowerCase()
        .replace(/\//g, "_")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-_]/g, "");

      return {
        id: docId,
        hornslinkId: org.Id,
        instagramHandle: null, // we'll have to manually curate this later
        name: org.Name,
        descriptionHtml: descriptionHtml,
        descriptionText: cleanDescription,
        website: org.WebsiteKey || null,
        summary: org.Summary || null,
        profilePicture: org.ProfilePicture,
        categoryNames: org.CategoryNames || [],
      };
    });

    logger.scrapeComplete("hornslink_organizations", formattedOrgs.length, 0);
    timer();
    return formattedOrgs;
  } catch (error) {
    timer();
    throw error;
  }
}
