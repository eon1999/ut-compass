import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest) {

    try {
        // call hornslink API
        const today = new Date().toISOString();
        const hornslinkUrl = `https://utexas.campuslabs.com/engage/api/discovery/event/search?endsAfter=${today}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=15&query=https://utexas.campuslabs.com/engage/api/discovery/event/search?endsAfter`;

        const res  = await fetch(hornslinkUrl);

        if (!res.ok) {
            throw new Error(`Failed to fetch data from hornslink API: ${res.statusText}`);
        }

        const data = await res.json();

        const events = data.value || data.events || [];

        let processedCount = 0;

        for (const rawEvent of events) {
            // process each ele,ent

            const formattedEvent = {
                title: rawEvent.name,
                description: rawEvent.description,
            }

            // to send to backend to route

            processedCount++;
        }
    } catch (error) {
        console.error('Error fetching or processing hornslink data:', error);
    }
}