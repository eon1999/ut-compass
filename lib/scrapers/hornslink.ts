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

interface FormattedEvent {
  id: string;
  content: {
    title: string;
    descriptionHtml: string;
    descriptionText: string;
    organizationName: string;
    location: string;
    startTime: string;
    endTime: string;
    theme: string;
    categories: string[];
    benefits: string[];
    imageUrl: string | null;
  };
}

export async function scrapeHornsLink() {
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
      externalUrl: `https://utexas.campuslabs.com/engage/event/${rawEvent.id}`,
      content: {
        title: rawEvent.name,
        descriptionHtml: rawEvent.description,
        descriptionText: cleanDescription,
        organizationName: rawEvent.organizationName,
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
    } as FormattedEvent;
  });
}
