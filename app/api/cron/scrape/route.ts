import {
  handleHornslinkEventIngest,
  handleInstagramEventIngest,
} from "@/lib/pipeline";
import { NextResponse } from "next/server";

export const maxDuration = 300;

function isAuthorized(
  request: Request,
  secretName: "CRON_SECRET" | "PIPELINE_SECRET_KEY",
): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env[secretName];

  if (!secret) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

async function runWeeklyScrape(
  request: Request,
  secretName: "CRON_SECRET" | "PIPELINE_SECRET_KEY",
) {
  if (!isAuthorized(request, secretName)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await handleHornslinkEventIngest();
    await handleInstagramEventIngest();

    return NextResponse.json(
      { success: true, message: "Weekly scrape completed" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error running weekly scrape:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  return runWeeklyScrape(request, "CRON_SECRET");
}

export async function POST(request: Request) {
  return runWeeklyScrape(request, "PIPELINE_SECRET_KEY");
}
