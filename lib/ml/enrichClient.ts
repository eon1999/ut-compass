// This file is responsible for enriching event data by calling the Hugging Face API to get embeddings and categories for the event.
// It will be used in the event ingestion pipeline to enhance the event data before it is stored in the database.

// typescript my beloved
interface IncomingEvent {
    id: string;
    content: {
        title: string;
        descriptionText: string;
        organizationName: string;
    }
}

// fetch from huggingface api to enrich event data with embeddings and categories
export async function enrichEventData(incomingEvent: IncomingEvent) {
    // where event is a JSON object with title and description fields
    const data = {
        text: `Event Title: ${incomingEvent.content.title}\nEvent Description: ${incomingEvent.content.descriptionText}\nEvent Organizer: ${incomingEvent.content.organizationName}`
    }
    const response = await fetch("http://localhost:8000/classify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        throw new Error(`Failed to enrich event data: ${response.statusText}`);
    }

    // the enriched data will include predicted categories and embeddings
    const enrichedData = await response.json();

    // now we need to merge this json into existing event object
    return {
        ...incomingEvent,
        weights: enrichedData
    }

}