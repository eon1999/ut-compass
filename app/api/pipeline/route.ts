import {
  handleHornslinkEventIngest,
  handleInstagramEventIngest,
  handleOrganizationIngest,
} from "@/lib/pipeline";

export async function POST(request: Request) {
  // security check
  console.log("Checking authorization for pipeline trigger...");
  const authHeader = request.headers.get("authorization");

  if (
    !authHeader ||
    authHeader !== `Bearer ${process.env.PIPELINE_SECRET_KEY}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  console.log("Authorized!");
  console.log("Executing pipeline...");

  try {
    const payload = await request.json();

    const includeOrganizations = payload.includeOrganizations ?? false;
    const includeHornslinkEvents = payload.includeHornslinkEvents ?? true;
    const includeInstagramEvents = payload.includeInstagramEvents ?? true;
    const overwrite = payload.overwrite ?? false;

    console.log("Pipeline Config:", {
      includeOrganizations,
      includeHornslinkEvents,
      includeInstagramEvents,
      overwrite,
    });

    if (includeOrganizations) {
      console.log("Executing organization ingestion...");
      await handleOrganizationIngest();
    }

    if (includeHornslinkEvents) {
      console.log("Executing HornsLink event ingestion...");
      await handleHornslinkEventIngest(overwrite);
    }

    if (includeInstagramEvents) {
      console.log("Executing Instagram event ingestion...");
      await handleInstagramEventIngest();
    }

    return new Response("Pipeline completed successfully", { status: 200 });
  } catch (error) {
    console.error("Error executing pipeline:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
