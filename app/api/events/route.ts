import { getEventsFromFirestore } from "@/lib/db/pullFromFirestore";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const events = await getEventsFromFirestore();
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
