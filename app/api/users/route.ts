import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/db/firebaseAdmin";
import { NextResponse } from "next/server";

type OnboardingPayload = {
  firstName: string;
  lastName: string;
  yearClassification: string;
  school: string;
  major: string;
  interests: string[];
  goals: string[];
  hobbies: string[];
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let decodedToken: { uid: string; email?: string; name?: string };
  try {
    decodedToken = await getAuth().verifyIdToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { uid, email, name } = decodedToken;

  let body: { onboarding: OnboardingPayload };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { onboarding } = body;
  if (!onboarding || typeof onboarding !== "object") {
    return new Response("Bad Request", { status: 400 });
  }

  const now = new Date().toISOString();
  const userDoc = {
    uid,
    email: email ?? null,
    displayName: name ?? null,
    onboarding: {
      firstName: onboarding.firstName ?? "",
      lastName: onboarding.lastName ?? "",
      yearClassification: onboarding.yearClassification ?? "",
      school: onboarding.school ?? "",
      major: onboarding.major ?? "",
      interests: Array.isArray(onboarding.interests) ? onboarding.interests : [],
      goals: Array.isArray(onboarding.goals) ? onboarding.goals : [],
      hobbies: Array.isArray(onboarding.hobbies) ? onboarding.hobbies : [],
    },
    submittedAt: now,
    updatedAt: now,
  };

  try {
    await db.collection("users").doc(uid).set(userDoc, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing user:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
