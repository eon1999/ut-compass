"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { doc, getDoc, setDoc, arrayRemove, updateDoc, deleteField } from "firebase/firestore";
import { Compass, Calendar, MapPin, House, Fish, Settings } from "lucide-react";
import Image from "next/image"
import { db } from "@/lib/firebase";
import { addToGoogleCalendar, deleteFromGoogleCalendar } from "@/lib/googleCalendar";

interface Tag {
  label: string;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  descriptionHtml?: string;
  tags: Tag[];
}

interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface DBEvent {
  id: string;
  source: "hornslink" | "manual";
  scraped_at: string;
  content: {
    title: string;
    descriptionText: string;
    descriptionHtml?: string;
    org_name: string;
    location: string;
    startTime: string | FirestoreTimestamp;
    endTime?: string | FirestoreTimestamp;
  };
  tags: {
    primary_category: string;
    confidence_score: number;
    all_scores: Record<string, number>;
    model_version: string;
  };
  manual_override: {
    is_forced: boolean;
    forced_category: string | null;
  };
}

interface User {
  name: string;
  email: string;
}

function parseStartTime(start_time: string | FirestoreTimestamp): Date {
  if (typeof start_time === "object" && "_seconds" in start_time) {
    return new Date(start_time._seconds * 1000);
  }
  return new Date(start_time);
}

function mapDBEventToCard(event: DBEvent): EventCard {
  const date = parseStartTime(event.content.startTime);
  const formattedDate = date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const topTags = event.tags?.all_scores
    ? Object.entries(event.tags.all_scores)
        .filter(([, score]) => score > 0.1)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([label]) => ({ label }))
    : [];

  const primaryCategory = event.tags?.primary_category ?? "Uncategorized";

  const endTime = event.content.endTime
    ? parseStartTime(event.content.endTime)
    : undefined;

  return {
    id: event.id,
    title: event.content.title,
    date: formattedDate,
    startTime: date,
    endTime,
    location: event.content.location,
    description: event.content.descriptionText,
    descriptionHtml: event.content.descriptionHtml,
    tags: [{ label: primaryCategory }, ...topTags],
  };
}

function Sidebar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: House, route: "/home" },
    { id: "saved", label: "Your Saved", icon: Fish, route: "/saved" },
    { id: "settings", label: "Settings", icon: Settings, route: "/profile"},
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 mb-10 px-2 text-blue-900">
        <div className="relative h-10 w-10 overflow-hidden">
          <Image src="/ut-compass.svg" alt="UT Compass logo" fill className="object-cover scale-120 origin-center" />
        </div>
        <span className="text-xl font-bold">UT Compass</span>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.route)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
              pathname === item.route
                ? "bg-amber-100 text-amber-800"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-2 mt-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
            👤
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 border border-gray-300 rounded-lg py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition"
            onClick={() => router.push("/profile")}
          >
            Edit Profile
          </button>
          <button
            className="flex-1 bg-blue-900 text-white rounded-lg py-1.5 text-sm hover:bg-blue-800 transition"
            onClick={() => router.push("..")}
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

function SavedEventCard({
  card,
  onUnsave,
  onAddToGCal,
}: {
  card: EventCard;
  onUnsave: (id: string) => void;
  onAddToGCal: (card: EventCard) => Promise<{ success: boolean; error?: string }>;
}) {
  const [gcalStatus, setGcalStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleGCal() {
    setGcalStatus("loading");
    const result = await onAddToGCal(card);
    if (!result.success && result.error !== "cancelled") {
      setGcalStatus("error");
      setTimeout(() => setGcalStatus("idle"), 2500);
    } else if (result.success) {
      setGcalStatus("success");
      setTimeout(() => setGcalStatus("idle"), 2500);
    } else {
      setGcalStatus("idle");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
        [Event Image]
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag.label}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700"
              >
                {tag.label}
              </span>
            ))}
          </div>
          <button
            onClick={() => onUnsave(card.id)}
            className="shrink-0 text-lg leading-none"
            aria-label="Unsave event"
          >
            🎣
          </button>
        </div>

        <h3 className="font-bold text-gray-900 text-base leading-snug">{card.title}</h3>

        <div className="flex flex-col gap-1 text-xs text-blue-600">
          <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4"></Calendar>
              {card.date}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4"></MapPin>
            {card.location}
          </span>
        </div>

        {card.descriptionHtml ? (
          <div
            className="text-xs text-gray-500 mt-1 line-clamp-2 [&_a]:underline [&_a]:text-blue-600 [&_br]:hidden"
            dangerouslySetInnerHTML={{ __html: card.descriptionHtml }}
          />
        ) : (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
        )}

        <button
          onClick={handleGCal}
          disabled={gcalStatus === "loading" || gcalStatus === "success"}
          className="mt-2 w-full border border-gray-200 rounded-xl py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition disabled:opacity-60"
        >
          {gcalStatus === "loading" && "Adding to Google Calendar..."}
          {gcalStatus === "success" && "Added to Google Calendar!"}
          {gcalStatus === "error" && "Failed — try again"}
          {gcalStatus === "idle" && "Add to Google Calendar"}
        </button>
      </div>
    </div>
  );
}

function GCalUnsaveModal({
  card,
  onUnsaveOnly,
  onUnsaveAndDelete,
  onDismiss,
}: {
  card: EventCard;
  onUnsaveOnly: () => Promise<void>;
  onUnsaveAndDelete: () => Promise<void>;
  onDismiss: () => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handle(action: () => Promise<void>) {
    setState("loading");
    try {
      await action();
      onDismiss();
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-gray-900 text-lg mb-1">
          Remove from Google Calendar?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          You added{" "}
          <span className="font-medium text-gray-700">{card.title}</span>{" "}
          to Google Calendar. Would you like to remove it too?
        </p>
        {state === "error" && (
          <p className="text-xs text-red-500 mb-3">Something went wrong. Please try again.</p>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handle(onUnsaveAndDelete)}
            disabled={state === "loading"}
            className="w-full bg-blue-900 text-white rounded-xl py-2 text-sm hover:bg-blue-800 transition disabled:opacity-70"
          >
            {state === "loading" ? "Removing..." : "Yes, remove from calendar"}
          </button>
          <button
            onClick={() => handle(onUnsaveOnly)}
            disabled={state === "loading"}
            className="w-full border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Just unsave
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [gcalEventIds, setGcalEventIds] = useState<Record<string, string>>({});
  const [allEvents, setAllEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsavePending, setUnsavePending] = useState<EventCard | null>(null);

  const currentUser: User = {
    name: user?.displayName ?? user?.email ?? "Student",
    email: user?.email ?? "",
  };

  // Load saved IDs and GCal event IDs from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, "users", user.uid);
    getDoc(userRef).then((snap) => {
      const data = snap.data();
      if (data?.savedEventIds) setSavedIds(new Set(data.savedEventIds));
      if (data?.gcalEventIds) setGcalEventIds(data.gcalEventIds ?? {});
    });
  }, [user?.uid]);

  // Load all events
  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data: DBEvent[]) => {
        setAllEvents(data.map(mapDBEventToCard));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleAddToGCal(card: EventCard) {
    const result = await addToGoogleCalendar({
      title: card.title,
      location: card.location,
      description: card.description,
      startTime: card.startTime,
      endTime: card.endTime,
    });
    if (result.success && result.gcalEventId && user?.uid) {
      setGcalEventIds((prev) => ({ ...prev, [card.id]: result.gcalEventId! }));
      const userRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userRef, { [`gcalEventIds.${card.id}`]: result.gcalEventId });
      } catch {
        await setDoc(userRef, { gcalEventIds: { [card.id]: result.gcalEventId } }, { merge: true });
      }
    }
    return result;
  }

  async function handleUnsave(eventId: string) {
    if (!user?.uid) return;
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { savedEventIds: arrayRemove(eventId) }, { merge: true });
  }

  async function handleUnsaveWithGCal(eventId: string, deleteFromGCal: boolean) {
    if (!user?.uid) return;
    if (deleteFromGCal) {
      const gcalEventId = gcalEventIds[eventId];
      if (gcalEventId) {
        const result = await deleteFromGoogleCalendar(gcalEventId);
        if (!result.success && result.error !== "cancelled") throw new Error(result.error);
      }
      setGcalEventIds((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { [`gcalEventIds.${eventId}`]: deleteField() });
    }
    await handleUnsave(eventId);
  }

  function handleUnsaveClick(eventId: string) {
    if (gcalEventIds[eventId]) {
      const card = savedEvents.find((e) => e.id === eventId);
      if (card) { setUnsavePending(card); return; }
    }
    handleUnsave(eventId);
  }

  const savedEvents = allEvents.filter((e) => savedIds.has(e.id));

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar user={currentUser} />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center px-8 py-5 bg-white border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Your Saved Events</h1>
        </header>

        <div className="px-8 py-6 flex-1">
          {loading && (
            <p className="text-gray-400 text-center py-10">Loading...</p>
          )}
          {!loading && savedEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-4xl mb-3">🎣</span>
              <p className="text-gray-500 text-base">No saved events yet.</p>
              <p className="text-gray-400 text-sm mt-1">
                Bookmark events from the dashboard to see them here.
              </p>
            </div>
          )}
          {!loading && savedEvents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedEvents.map((card) => (
                <SavedEventCard key={card.id} card={card} onUnsave={handleUnsaveClick} onAddToGCal={handleAddToGCal} />
              ))}
            </div>
          )}
        </div>
      </div>

      {unsavePending && (
        <GCalUnsaveModal
          card={unsavePending}
          onUnsaveOnly={async () => { await handleUnsave(unsavePending.id); }}
          onUnsaveAndDelete={async () => { await handleUnsaveWithGCal(unsavePending.id, true); }}
          onDismiss={() => setUnsavePending(null)}
        />
      )}
    </div>
  );
}
