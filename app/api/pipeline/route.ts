import { handleEventIngest } from "@/lib/pipeline";

export async function POST(request: Request) {
    // security check
    const authHeader = request.headers.get("authorization");

    if (!authHeader || authHeader !== `Bearer ${process.env.PIPELINE_SECRET_KEY}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const pipelinePromise = handleEventIngest();
        // no await since we want to return response immediately
        return new Response("Pipeline started", { status: 200 });

    } catch (error) {
        console.error("Error starting pipeline:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}