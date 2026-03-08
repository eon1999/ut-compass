import { cleanExpiredEvents } from "@/lib/db/cleanEventsCollection";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (
    !authHeader ||
    authHeader !== `Bearer ${process.env.PIPELINE_SECRET_KEY}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { deleted } = await cleanExpiredEvents();
    return NextResponse.json({ deleted, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error cleaning expired events:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
