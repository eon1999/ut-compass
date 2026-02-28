interface RawEvent {
  id: string;
  description?: string;
  imagePath?: string;
  organizationProfilePicture?: string;
  name: string;
  organizationName: string;
  location: string;
  startsOn: string;
  endsOn: string;
  theme?: string;
  categoryNames?: string[];
  benefitNames?: string[];
}

export async function scrapeHornslink() {
    // grab today's date in ISO format to filter events that are upcoming
    const today = new Date().toISOString();
    const hornslinkUrl = `https://utexas.campuslabs.com/engage/api/discovery/event/search?endsAfter=${today}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=15&query=`;
    const res = await fetch(hornslinkUrl);

    // make sure the response is ok
    if (!res.ok) {
        throw new Error(`Failed to fetch from HornsLink: ${res.statusText}`);
    }

    // parse the response as JSON
    const data = await res.json();
    const events = data[0]?.value || [];

    // map the raw events to our internal schema
    // clean up any HTML tags from the description and handle missing fields gracefully
    return events.map((rawEvent: RawEvent) => {
        const cleanDescription = rawEvent.description
        ? rawEvent.description.replace(/<[^>]*>?/gm, "").replace(/&amp;/g, "&")
        : "No description provided.";

        const imageId = rawEvent.imagePath || rawEvent.organizationProfilePicture;

        // return that bad boy
        return {
        id: `evt_${rawEvent.id}`,
        source: "hornslink",
        external_url: `https://utexas.campuslabs.com/engage/event/${rawEvent.id}`,
        content: {
            title: rawEvent.name,
            description_html: rawEvent.description,
            description_text: cleanDescription,
            org_name: rawEvent.organizationName,
            location: rawEvent.location,
            start_time: rawEvent.startsOn,
            end_time: rawEvent.endsOn,
            theme: rawEvent.theme || "None",
            categories: rawEvent.categoryNames || [],
            benefits: rawEvent.benefitNames || [],
            image_url: imageId
            ? `https://se-images.campuslabs.com/clink/images/${imageId}`
            : null,
        },
        };
    });
    }
