import { handleEventIngest, handleOrganizationIngest } from "@/lib/pipeline";

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
    const { includeOrganizations, overwrite } = await request.json();

    console.log(
      "Grabbed flag for organization ingestion:",
      includeOrganizations,
    );
    console.log("Grabbed flag for overwrite:", overwrite);
    if (includeOrganizations) {
      console.log("Including organization ingestion in pipeline...");
      await handleOrganizationIngest();
    }

    console.log("Executing event ingestion...");
    await handleEventIngest(overwrite ?? false);

    return new Response("Pipeline completed successfully", { status: 200 });
  } catch (error) {
    console.error("Error executing pipeline:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
