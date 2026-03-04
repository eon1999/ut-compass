import { handleEventIngest, handleOrganizationIngest } from "@/lib/pipeline";

export async function POST(request: Request) {
    // security check
    const authHeader = request.headers.get("authorization");

    if (!authHeader || authHeader !== `Bearer ${process.env.PIPELINE_SECRET_KEY}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { includeOrganizations } = await request.json();

        await handleEventIngest();

        if (includeOrganizations) {
            await handleOrganizationIngest();
        }

        return new Response("Pipeline completed successfully", { status: 200 });

    } catch (error) {
        console.error("Error executing pipeline:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}