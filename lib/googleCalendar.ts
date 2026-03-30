"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface GCalEventData {
  title: string;
  location: string;
  description: string;
  startTime: Date;
  endTime?: Date;
}

export async function addToGoogleCalendar(
  event: GCalEventData
): Promise<{ success: boolean; gcalEventId?: string; error?: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.events");

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) return { success: false, error: "No access token returned." };

    const endTime =
      event.endTime ?? new Date(event.startTime.getTime() + 60 * 60 * 1000);

    const body = {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: { dateTime: event.startTime.toISOString(), timeZone: "America/Chicago" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/Chicago" },
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData?.error?.message ?? "Google Calendar API error.",
      };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, gcalEventId: data.id as string | undefined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: msg };
  }
}

export async function deleteFromGoogleCalendar(
  gcalEventId: string
): Promise<{ success: boolean; error?: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.events");

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) return { success: false, error: "No access token returned." };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok && res.status !== 404) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData?.error?.message ?? "Google Calendar API error.",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: msg };
  }
}
