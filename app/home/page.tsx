"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  doc,
  getDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import {
  Calendar,
  MapPin,
  House,
  Fish,
  Settings,
  Eye,
  User,
} from "lucide-react";
import Image from "next/image";
import { getDb } from "@/lib/firebase";
import {
  addToGoogleCalendar,
  deleteFromGoogleCalendar,
} from "@/lib/googleCalendar";
import { buildUserPreferences } from "@/lib/scoring/eventScorer";
import {
  applyEventFilters,
  type SortBy,
  type SourceFilter,
} from "@/lib/filtering/eventFilter";
import { getCategoryStyle } from "@/lib/categories";

interface EventCard {
  id: string;
  title: string;
  organization: string;
  date: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  descriptionHtml?: string;
  tags: string[];
  imageUrl?: string;
  source?: string;
  weights?: {
    categories?: Record<string, number>;
    majors?: Record<string, number>;
  };
}

interface UpcomingEvent {
  id: string;
  title: string;
  time: string;
  location: string;
}

interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface DBEvent {
  id: string;
  src?: string;
  source?: "hornslink" | "instagram" | "manual";
  scraped_at?: string;
  organization?: { name: string; id: string };
  instagramHandle?: string;
  organizationId?: string | null;
  // HornsLink events use content; Instagram events use extractedDetails
  content?: {
    title: string;
    descriptionText: string;
    descriptionHtml?: string;
    org_name?: string;
    location: string;
    startTime: string | FirestoreTimestamp;
    endTime?: string | FirestoreTimestamp;
  };
  extractedDetails?: {
    title: string | null;
    date: string | null;
    time: string | null;
    location: string | null;
    description: string | null;
  };
  tags?: {
    primary_category: string;
    confidence_score: number;
    all_scores: Record<string, number>;
    model_version: string;
  };
  weights?: {
    categories?: Record<string, number>;
    majors?: Record<string, number>;
  };
  manual_override?: {
    is_forced: boolean;
    forced_category: string | null;
  };
}

function Sidebar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: House, route: "/home" },
    { id: "saved", label: "Your Saved", icon: Fish, route: "/saved" },
    { id: "settings", label: "Settings", icon: Settings, route: "/profile" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 px-2 text-blue-900">
        <div className="relative h-10 w-10 overflow-hidden">
          <Image
            src="/ut-compass.svg"
            alt="UT Compass logo"
            fill
            className="object-cover scale-120 origin-center"
          />
        </div>
        <span className="text-xl font-more-sugar font-bold">UT Compass</span>
      </div>

      {/* Nav */}
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

      {/* User Profile */}
      <div className="flex flex-col gap-3 px-2 mt-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
            <User className="h-6 w-6"></User>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user.name}
            </p>
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

function Header({ name, savedCount }: { name: string; savedCount: number }) {
  return (
    <div className="relative w-full h-64 flex flex-col justify-between pb-4.5 px-8 py-3 overflow-hidden">
      <Image
        src="/banner.png"
        alt="Ocean waves background scene"
        fill
        className="object-cover [object-position:center_65%]"
      />

      <div className="relative z-10 flex justify-end items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
          <Fish className="w-4 h-4" />
          {savedCount} Total Caught
        </div>
      </div>

      <h1 className="relative z-10 text-4xl font-more-sugar font-bold text-white">
        Ahoy, {name}!
      </h1>
    </div>
  );
}

function SearchAndFilters({
  excludeConflicting,
  onToggleExclude,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sourceFilter,
  onSourceFilterChange,
}: {
  excludeConflicting: boolean;
  onToggleExclude: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortBy;
  onSortByChange: (v: SortBy) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (v: SourceFilter) => void;
}) {
  const selectClass =
    "border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-gray-50 transition appearance-none pr-8";

  return (
    <div className="flex gap-3 flex-wrap px-8 py-5">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search Clubs, Events, and More..."
        className="flex-1 min-w-48 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
      />

      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          className={selectClass}
        >
          <option value="none">Sort: Default</option>
          <option value="categoryMatch">Sort: Category Match</option>
          <option value="majorMatch">Sort: Major Match</option>
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
          ▾
        </span>
      </div>

      <div className="relative">
        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value as SourceFilter)}
          className={selectClass}
        >
          <option value="all">Source: All</option>
          <option value="hornslink">Source: HornsLink</option>
          <option value="instagram">Source: Instagram</option>
          <option value="manual">Source: Manual</option>
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
          ▾
        </span>
      </div>

      <button
        onClick={onToggleExclude}
        className={`flex items-center gap-1 border rounded-full px-4 py-2 text-sm transition ${
          excludeConflicting
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
      >
        Exclude Conflicting
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}

function EventCardItem({
  card,
  isSaved,
  onToggleSave,
  isConflicting,
}: {
  card: EventCard;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isConflicting?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const descRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);

  useEffect(() => {
    const el = descRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight);
  }, [card.description, card.descriptionHtml]);

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow ${isConflicting ? "opacity-40 grayscale" : ""}`}
    >
      {/* Category image */}
      <div className="h-36 relative overflow-hidden bg-gray-100">
        <Image
          src={getCategoryImage(card.tags[0])}
          alt={getCategoryStyle(card.tags[0]).label}
          fill
          className="object-cover object-center"
        />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Tags + bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((key) => {
              const cat = getCategoryStyle(key);
              return (
                <span
                  key={key}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${cat.bg} ${cat.text}`}
                >
                  {cat.label}
                </span>
              );
            })}
          </div>
          <button
            onClick={() => onToggleSave(card.id)}
            className="shrink-0 text-lg leading-none"
            aria-label={isSaved ? "Unsave event" : "Save event"}
          >
            {isSaved ? (
              <Fish className="h-6 w-6 fill-[#1a3a5c] text-[#1a3a5c]" />
            ) : (
              <Fish className="h-6 w-6 text-[#1a3a5c]" />
            )}
          </button>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug">
          {card.title}
        </h3>

        {/* Organization Name */}
        <h4 className="text-xs text-gray-700 text-base">{card.organization}</h4>

        {/* Date & Location */}
        <div className="flex flex-col gap-1 text-xs text-blue-600">
          {/* Replace with illustration */}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4"></Calendar>
            {card.date}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4"></MapPin>
            {card.location}
          </span>
        </div>

        {/* Description */}
        {card.descriptionHtml ? (
          <div
            ref={descRef as React.RefObject<HTMLDivElement>}
            className={`text-xs text-gray-500 mt-1 [&_a]:underline [&_a]:text-blue-600 [&_br]:hidden ${expanded ? "" : "line-clamp-3"}`}
            dangerouslySetInnerHTML={{ __html: card.descriptionHtml }}
          />
        ) : (
          <p
            ref={descRef as React.RefObject<HTMLParagraphElement>}
            className={`text-xs text-gray-500 mt-1 ${expanded ? "" : "line-clamp-3"}`}
          >
            {card.description}
          </p>
        )}
        {(isClamped || expanded) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-600 hover:underline self-start mt-0.5"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

function UpcomingEventsPanel({ events }: { events: UpcomingEvent[] }) {
  return (
    <aside className="w-72 shrink-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-base">Upcoming Events</h2>
          <span className="text-blue-900">
            <Calendar className="h-7 w-7"></Calendar>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition cursor-pointer"
            >
              <p className="font-semibold text-sm text-gray-800 mb-2 leading-snug">
                {event.title}
              </p>
              <div className="mt-2 flex flex-col gap-0.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4"></Calendar>
                  {event.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4"></MapPin>
                  {event.location}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

const CATEGORY_IMAGES: Record<string, string> = {
  technologyAndEngineering: "/category_images/tech_engineering.jpg",
  academicAndResearch:      "/category_images/academic_research.jpg",
  careerAndNetworking:      "/category_images/career_networking.jpg",
  healthAndWellness:        "/category_images/health_wellness.jpg",
  socialAndCommunity:       "/category_images/social_community.jpg",
  artsAndPerformance:       "/category_images/arts_performance.jpg",
  music:                    "/category_images/music.jpg",
  politicsAndAdvocacy:      "/category_images/politics_advocacy.jpg",
  culturalAndInternational: "/category_images/cultural_international.jpg",
  volunteerAndService:      "/category_images/volunteer_service.jpg",
  sportsAndRecreation:      "/category_images/sports_recreation.jpg",
  foodAndDrinks:            "/category_images/food_drinks.jpg",
  faithAndSpirituality:     "/category_images/faith_spirituality.jpg",
  gamingAndEsports:         "/category_images/gaming_esports.jpg",
};

function getCategoryImage(category: string): string {
  return CATEGORY_IMAGES[category] ?? "/category_images/social_community.jpg";
}

function parseStartTime(start_time: string | FirestoreTimestamp): Date {
  if (typeof start_time === "object" && "_seconds" in start_time) {
    return new Date(start_time._seconds * 1000);
  }
  return new Date(start_time);
}

function mapDBEventToCard(event: DBEvent): EventCard {
  let startTime: Date;
  let formattedDate: string;
  let endTime: Date | undefined;

  if (event.content?.startTime) {
    startTime = parseStartTime(event.content.startTime);
    formattedDate = startTime.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    endTime = event.content.endTime
      ? parseStartTime(event.content.endTime)
      : undefined;
  } else {
    // Instagram event: date extracted as freeform strings by the ML model
    const rawDateStr = [
      event.extractedDetails?.date,
      event.extractedDetails?.time,
    ]
      .filter(Boolean)
      .join(" ");
    const parsed = rawDateStr ? new Date(rawDateStr) : null;
    // Use far-future sentinel if unparseable so the event still shows
    startTime =
      parsed && !isNaN(parsed.getTime()) ? parsed : new Date(8640000000000000);
    formattedDate = rawDateStr || "Date TBD";
    endTime = undefined;
  }

  const primaryCategory =
    event.tags?.primary_category ??
    (event.weights?.categories
      ? Object.entries(event.weights.categories).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0]
      : undefined) ??
    "other";

  return {
    id: event.id,
    title:
      event.content?.title ??
      event.extractedDetails?.title ??
      "Untitled",
    organization:
      event.organization?.name ??
      event.content?.org_name ??
      event.instagramHandle ??
      "",
    date: formattedDate,
    startTime,
    endTime,
    location:
      event.content?.location ??
      event.extractedDetails?.location ??
      "",
    description:
      event.content?.descriptionText ??
      event.extractedDetails?.description ??
      "",
    descriptionHtml: event.content?.descriptionHtml,
    tags: [primaryCategory],
    source: event.source,
    weights: event.weights,
  };
}

function GCalModal({
  card,
  onConfirm,
  onDismiss,
}: {
  card: EventCard;
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function handleConfirm() {
    setState("loading");
    try {
      await onConfirm();
      setState("success");
      setTimeout(onDismiss, 1500);
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
        {state === "success" ? (
          <p className="text-center text-blue-900 font-semibold py-2">
            Added to Google Calendar!
          </p>
        ) : (
          <>
            <h2 className="font-bold text-gray-900 text-lg mb-1">
              Add to Google Calendar?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Add{" "}
              <span className="font-medium text-gray-700">{card.title}</span> to
              your Google Calendar.
            </p>
            {state === "error" && (
              <p className="text-xs text-red-500 mb-3">
                Something went wrong. Please try again.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                disabled={state === "loading"}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                No thanks
              </button>
              <button
                onClick={handleConfirm}
                disabled={state === "loading"}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2 text-sm hover:bg-blue-800 transition disabled:opacity-70"
              >
                {state === "loading" ? "Adding..." : "Yes, add it"}
              </button>
            </div>
          </>
        )}
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
          <span className="font-medium text-gray-700">{card.title}</span> to
          Google Calendar. Would you like to remove it too?
        </p>
        {state === "error" && (
          <p className="text-xs text-red-500 mb-3">
            Something went wrong. Please try again.
          </p>
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

/**
 * Returns the real Firestore instance (not the lazy proxy).
 * Safe to call inside useEffect / event handlers (browser-only).
 */
function getFirestoreInstance() {
  return getDb();
}

function useSavedEvents(userId: string | undefined) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [gcalEventIds, setGcalEventIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    const userRef = doc(getFirestoreInstance(), "users", userId);
    getDoc(userRef)
      .then((snap) => {
        const data = snap.data();
        if (data?.savedEventIds) setSavedIds(new Set(data.savedEventIds));
        if (data?.gcalEventIds) setGcalEventIds(data.gcalEventIds ?? {});
      })
      .catch((err) =>
        console.warn("useSavedEvents: failed to load saved events", err),
      );
  }, [userId]);

  async function toggleSave(eventId: string) {
    if (!userId) return;
    const userRef = doc(getDb(), "users", userId);
    const isSaved = savedIds.has(eventId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
    try {
      await setDoc(
        userRef,
        { savedEventIds: isSaved ? arrayRemove(eventId) : arrayUnion(eventId) },
        { merge: true },
      );
    } catch {
      // revert on error
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
    }
  }

  async function storeGcalEventId(appEventId: string, gcalEventId: string) {
    if (!userId) return;
    setGcalEventIds((prev) => ({ ...prev, [appEventId]: gcalEventId }));
    const userRef = doc(getDb(), "users", userId);
    try {
      await updateDoc(userRef, { [`gcalEventIds.${appEventId}`]: gcalEventId });
    } catch {
      // doc may not exist yet — fall back to setDoc merge
      await setDoc(
        userRef,
        { gcalEventIds: { [appEventId]: gcalEventId } },
        { merge: true },
      );
    }
  }

  async function removeGcalEventId(appEventId: string) {
    if (!userId) return;
    setGcalEventIds((prev) => {
      const next = { ...prev };
      delete next[appEventId];
      return next;
    });
    const userRef = doc(getDb(), "users", userId);
    await updateDoc(userRef, { [`gcalEventIds.${appEventId}`]: deleteField() });
  }

  return {
    savedIds,
    toggleSave,
    gcalEventIds,
    storeGcalEventId,
    removeGcalEventId,
  };
}

function useEvents() {
  const [cards, setCards] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to fetch events");
        const data: DBEvent[] = await res.json();

        // #region agent log
        const sourceCounts: Record<string, number> = {};
        data.forEach((e) => { const s = e.source ?? "unknown"; sourceCounts[s] = (sourceCounts[s] ?? 0) + 1; });
        console.log('[DBG 42a428][post-fix] sourceCounts:', JSON.stringify(sourceCounts), 'total:', data.length);
        // #endregion

        const kept = data.filter((e) => e.content?.startTime || e.source === "instagram");
        const dropped = data.filter((e) => !e.content?.startTime && e.source !== "instagram");

        // #region agent log
        const droppedSources: Record<string, number> = {};
        dropped.forEach((e) => { const s = e.source ?? "unknown"; droppedSources[s] = (droppedSources[s] ?? 0) + 1; });
        const keptSources: Record<string, number> = {};
        kept.forEach((e) => { const s = e.source ?? "unknown"; keptSources[s] = (keptSources[s] ?? 0) + 1; });
        console.log('[DBG 42a428][post-fix] droppedSources:', JSON.stringify(droppedSources), '| keptSources:', JSON.stringify(keptSources));
        // #endregion

        let mapped: EventCard[] = [];
        const mapErrors: string[] = [];
        for (const e of kept) {
          try {
            mapped.push(mapDBEventToCard(e));
          } catch (mapErr) {
            mapErrors.push(`${e.id}(${e.source}): ${(mapErr as Error).message}`);
          }
        }

        // #region agent log
        console.log('[DBG 42a428][post-fix] mapped:', mapped.length, 'errors:', mapErrors.length, JSON.stringify(mapErrors.slice(0, 5)));
        // #endregion

        setCards(mapped);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return { cards, loading, error };
}

function useUserProfile(uid?: string) {
  const [userPrefs, setUserPrefs] = useState<Record<string, number>>({});
  const [majorPrefs, setMajorPrefs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(getFirestoreInstance(), "users", uid))
      .then((snap) => {
        const data = snap.data();
        if (!data) return;
        setUserPrefs(
          buildUserPreferences({
            interests: data.interests,
            goals: data.goals,
            hobbies: data.hobbies,
            major: data.major,
          }),
        );
        setMajorPrefs(buildUserPreferences({ major: data.major }));
      })
      .catch((err) =>
        console.warn("useUserProfile: failed to load user preferences", err),
      );
  }, [uid]);

  return { userPrefs, majorPrefs };
}

export default function Page() {
  const { cards, loading, error } = useEvents();
  const { user } = useAuth();
  const {
    savedIds,
    toggleSave,
    gcalEventIds,
    storeGcalEventId,
    removeGcalEventId,
  } = useSavedEvents(user?.uid);
  const { userPrefs, majorPrefs } = useUserProfile(user?.uid);
  const [excludeConflicting, setExcludeConflicting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("none");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [gcalPending, setGcalPending] = useState<EventCard | null>(null);
  const [unsavePending, setUnsavePending] = useState<EventCard | null>(null);

  const isGoogleUser =
    user?.providerData.some((p) => p.providerId === "google.com") ?? false;

  async function handleToggleSave(eventId: string) {
    const wasAlreadySaved = savedIds.has(eventId);
    if (wasAlreadySaved) {
      if (isGoogleUser && gcalEventIds[eventId]) {
        const card = cards.find((c) => c.id === eventId);
        if (card) {
          setUnsavePending(card);
          return;
        }
      }
      await toggleSave(eventId);
    } else {
      await toggleSave(eventId);
      if (isGoogleUser) {
        const card = cards.find((c) => c.id === eventId);
        if (card) setGcalPending(card);
      }
    }
  }

  const currentUser: User = {
    name: user?.displayName ?? user?.email ?? "Student",
    email: user?.email ?? "",
    avatarUrl: user?.photoURL ?? undefined,
  };

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingEvents: UpcomingEvent[] = cards
    .filter(
      (c) =>
        savedIds.has(c.id) &&
        c.startTime >= now &&
        c.startTime <= sevenDaysLater,
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .map((c) => ({
      id: c.id,
      title: c.title,
      time: c.date,
      location: c.location,
    }));

  const query = searchQuery.toLowerCase().trim();
  const searchedCards = query
    ? cards.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.organization.toLowerCase().includes(query) ||
          c.location.toLowerCase().includes(query) ||
          c.tags.some((t) =>
            getCategoryStyle(t).label.toLowerCase().includes(query),
          ),
      )
    : cards;

  const filteredCards = applyEventFilters(
    searchedCards,
    { sortBy, sourceFilter },
    userPrefs,
    majorPrefs,
  );

  const savedCards = cards.filter((c) => savedIds.has(c.id));
  const conflictingIds = new Set(
    cards
      .filter((card) => !savedIds.has(card.id))
      .filter((card) =>
        savedCards.some((saved) => {
          const cardEnd =
            card.endTime ?? new Date(card.startTime.getTime() + 60 * 60 * 1000);
          const savedEnd =
            saved.endTime ??
            new Date(saved.startTime.getTime() + 60 * 60 * 1000);
          return card.startTime < savedEnd && cardEnd > saved.startTime;
        }),
      )
      .map((c) => c.id),
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar user={currentUser} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar
        <header className="flex justify-end items-center gap-3 px-8 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
            <Fish></Fish>
            {savedIds.size} Total Caught
          </div>
        </header> */}

        <Header
          name={currentUser.name.split(" ")[0]}
          savedCount={savedIds.size}
        />

        <SearchAndFilters
          excludeConflicting={excludeConflicting}
          onToggleExclude={() => setExcludeConflicting((v) => !v)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
        />

        {/* Main content + sidebar */}
        <div className="flex gap-6 px-8 pb-8 flex-1">
          {/* Cards grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
            {loading && (
              <p className="text-gray-400 col-span-3 text-center py-10">
                Loading events...
              </p>
            )}
            {error && (
              <p className="text-red-500 col-span-3 text-center py-10">
                {error}
              </p>
            )}
            {!loading &&
              !error &&
              filteredCards.map((card) => (
                <EventCardItem
                  key={card.id}
                  card={card}
                  isSaved={savedIds.has(card.id)}
                  onToggleSave={handleToggleSave}
                  isConflicting={
                    excludeConflicting && conflictingIds.has(card.id)
                  }
                />
              ))}
          </div>

          {/* Upcoming events */}
          <UpcomingEventsPanel events={upcomingEvents} />
        </div>
      </div>

      {gcalPending && (
        <GCalModal
          card={gcalPending}
          onConfirm={async () => {
            const result = await addToGoogleCalendar(gcalPending);
            if (!result.success && result.error !== "cancelled") {
              throw new Error(result.error);
            }
            if (result.success && result.gcalEventId) {
              await storeGcalEventId(gcalPending.id, result.gcalEventId);
            }
          }}
          onDismiss={() => setGcalPending(null)}
        />
      )}
      {unsavePending && (
        <GCalUnsaveModal
          card={unsavePending}
          onUnsaveOnly={async () => {
            await toggleSave(unsavePending.id);
          }}
          onUnsaveAndDelete={async () => {
            const gcalEventId = gcalEventIds[unsavePending.id];
            if (gcalEventId) {
              const result = await deleteFromGoogleCalendar(gcalEventId);
              if (!result.success && result.error !== "cancelled")
                throw new Error(result.error);
            }
            await toggleSave(unsavePending.id);
            await removeGcalEventId(unsavePending.id);
          }}
          onDismiss={() => setUnsavePending(null)}
        />
      )}
    </div>
  );
}
