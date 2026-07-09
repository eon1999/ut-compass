import {
  handleHornslinkEventIngest,
  handleInstagramEventIngest,
  handleOrganizationIngest,
} from "@/lib/pipeline";
import { getLogger } from "@/lib/logger";

const logger = getLogger({ component: "api" });

// Set the max duration for Vercel (in seconds)
// Note: Maximum is 60 for Hobby, 300 for Pro, 900 for Enterprise
export const maxDuration = 300;

export async function POST(request: Request) {
  const timer = logger.time("pipeline_api_post");
  logger.info("Pipeline API request received", { method: "POST" });

  // security check
  const authHeader = request.headers.get("authorization");

  if (
    !authHeader ||
    authHeader !== `Bearer ${process.env.PIPELINE_SECRET_KEY}`
  ) {
    logger.warn("Unauthorized pipeline API request", { authHeader: authHeader ? "present" : "missing" });
    timer();
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await request.json();

    const includeOrganizations = payload.includeOrganizations ?? false;
    const includeHornslinkEvents = payload.includeHornslinkEvents ?? true;
    const includeInstagramEvents = payload.includeInstagramEvents ?? true;
    const overwrite = payload.overwrite ?? false;

    logger.info("Pipeline configuration", { includeOrganizations, includeHornslinkEvents, includeInstagramEvents, overwrite });

    if (includeOrganizations) {
      logger.pipelineStep("organization_ingest");
      await handleOrganizationIngest();
    }

    if (includeHornslinkEvents) {
      logger.pipelineStep("hornslink_event_ingest");
      await handleHornslinkEventIngest(overwrite);
    }

    if (includeInstagramEvents) {
      logger.pipelineStep("instagram_event_ingest");
      await handleInstagramEventIngest();
    }

    logger.info("Pipeline completed successfully");
    timer();
    return new Response("Pipeline completed successfully", { status: 200 });
  } catch (error) {
    logger.error("Pipeline API error", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    timer();
    return new Response("Internal Server Error", { status: 500 });
  }
}
