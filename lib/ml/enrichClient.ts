// This file is responsible for enriching event data by calling the Hugging Face API to get embeddings and categories for the event. 
// It will be used in the event ingestion pipeline to enhance the event data before it is stored in the database.

// typescript my beloved
interface incomingEvent {
    content: {
        name: string;
        description_text: string;
        organization_name: string;
    }
}

// fetch from huggingface api to enrich event data with embeddings and categories
export async function enrichEventData(incomingEvent: incomingEvent) {
    // where event is a JSON object with title and description fields
    const data = {
        text: `Event Name: ${incomingEvent.content.name}\nEvent Description: ${incomingEvent.content.description_text}\nEvent Organizer: ${incomingEvent.content.organization_name}`
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
        ...event,
        enriched: enrichedData
    }

}