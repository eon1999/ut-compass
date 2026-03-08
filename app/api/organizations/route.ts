import { getOrganizationsFromFirestore } from "@/lib/db/pullFromFirestore";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const organizations = await getOrganizationsFromFirestore();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
