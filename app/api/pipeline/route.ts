import {
  handleHornslinkEventIngest,
  handleInstagramEventIngest,
  handleOrganizationIngest,
} from "@/lib/pipeline";

// Set the max duration for Vercel (in seconds)
// Note: Maximum is 60 for Hobby, 300 for Pro, 900 for Enterprise
export const maxDuration = 300;

export async function POST(request: Request) {
  // security check
  const authHeader = request.headers.get("authorization");

  if (
    !authHeader ||
    authHeader !== `Bearer ${process.env.PIPELINE_SECRET_KEY}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await request.json();

    const includeOrganizations = payload.includeOrganizations ?? false;
    const includeHornslinkEvents = payload.includeHornslinkEvents ?? true;
    const includeInstagramEvents = payload.includeInstagramEvents ?? true;
    const overwrite = payload.overwrite ?? false;

    if (includeOrganizations) {
      await handleOrganizationIngest();
    }

    if (includeHornslinkEvents) {
      await handleHornslinkEventIngest(overwrite);
    }

    if (includeInstagramEvents) {
      await handleInstagramEventIngest();
    }

    return new Response("Pipeline completed successfully", { status: 200 });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
