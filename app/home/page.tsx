"use client";

import { useState, useEffect, useMemo } from "react";
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
import DOMPurify from "dompurify";
import { getDb } from "@/lib/firebase";
import {
  addToGoogleCalendar,
  deleteFromGoogleCalendar,
} from "@/lib/googleCalendar";
import {
  buildUserPreferences,
  getSimilarEvents,
} from "@/lib/scoring/eventScorer";
import {
  applyEventFilters,
  type SortBy,
  type SourceFilter,
  type DateRange,
} from "@/lib/filtering/eventFilter";
import { getCategoryStyle, CATEGORY_CONFIG } from "@/lib/categories";

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

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisWeekend", label: "This Weekend" },
  { value: "nextWeek", label: "Next Week" },
];

function SearchAndFilters({
  excludeConflicting,
  onToggleExclude,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sourceFilter,
  onSourceFilterChange,
  dateRange,
  onDateRangeChange,
  categoryFilter,
  onCategoryFilterChange,
}: {
  excludeConflicting: boolean;
  onToggleExclude: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortBy;
  onSortByChange: (v: SortBy) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (v: SourceFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (v: DateRange) => void;
  categoryFilter: string[];
  onCategoryFilterChange: (keys: string[]) => void;
}) {
  const selectClass =
    "border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-gray-50 transition appearance-none pr-8";

  const hasActiveFilters =
    dateRange !== "all" ||
    categoryFilter.length > 0 ||
    sourceFilter !== "all" ||
    sortBy !== "none";

  function toggleCategory(key: string) {
    if (categoryFilter.includes(key)) {
      onCategoryFilterChange(categoryFilter.filter((k) => k !== key));
    } else {
      onCategoryFilterChange([...categoryFilter, key]);
    }
  }

  function clearAll() {
    onDateRangeChange("all");
    onCategoryFilterChange([]);
    onSourceFilterChange("all");
    onSortByChange("none");
  }

  return (
    <div className="flex flex-col gap-3 px-8 py-5 border-b border-gray-100">
      {/* Row 1: search + sort + source + exclude */}
      <div className="flex gap-3 flex-wrap items-center">
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

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-400 hover:text-gray-600 transition ml-auto"
          >
            × Clear filters
          </button>
        )}
      </div>

      {/* Row 2: date range pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {DATE_RANGE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onDateRangeChange(value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              dateRange === value
                ? "bg-blue-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Row 3: category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {Object.entries(CATEGORY_CONFIG).map(([key, style]) => {
          const active = categoryFilter.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? `${style.bg} ${style.text} ring-1 ring-current`
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventCardItem({
  card,
  isSaved,
  onToggleSave,
  isConflicting,
  onClick,
}: {
  card: EventCard;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isConflicting?: boolean;
  onClick: (card: EventCard) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(card)}
      onKeyDown={(e) => e.key === "Enter" && onClick(card)}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer ${isConflicting ? "opacity-40 grayscale" : ""}`}
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
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(card.id);
            }}
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
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {card.date}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {card.location}
          </span>
        </div>

        {/* Description preview */}
        <p className="text-xs text-gray-500 mt-1 line-clamp-3">
          {card.description || "Click to view details."}
        </p>
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

function SimilarEventMiniCard({
  card,
  isSaved,
  onToggleSave,
  onClick,
}: {
  card: EventCard;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClick: (card: EventCard) => void;
}) {
  const cat = getCategoryStyle(card.tags[0]);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(card)}
      onKeyDown={(e) => e.key === "Enter" && onClick(card)}
      className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
    >
      <div className="w-14 h-14 relative shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={getCategoryImage(card.tags[0])}
          alt={cat.label}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{card.title}</p>
        <p className="text-xs text-gray-500 truncate">{card.organization}</p>
        <p className="text-xs text-blue-600 mt-0.5">{card.date}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave(card.id);
        }}
        className="shrink-0 self-start mt-0.5"
        aria-label={isSaved ? "Unsave event" : "Save event"}
      >
        {isSaved ? (
          <Fish className="h-5 w-5 fill-[#1a3a5c] text-[#1a3a5c]" />
        ) : (
          <Fish className="h-5 w-5 text-[#1a3a5c]" />
        )}
      </button>
    </div>
  );
}

function EventDetailPanel({
  card,
  allCards,
  savedIds,
  onToggleSave,
  onDismiss,
  onSelectCard,
}: {
  card: EventCard;
  allCards: EventCard[];
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onDismiss: () => void;
  onSelectCard: (card: EventCard) => void;
}) {
  const isSaved = savedIds.has(card.id);
  const similarEvents = getSimilarEvents(card, allCards, 4);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            ← Back
          </button>
          <button
            onClick={() => onToggleSave(card.id)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition"
            style={
              isSaved
                ? { borderColor: "#1a3a5c", color: "#1a3a5c", background: "#f0f4f8" }
                : { borderColor: "#d1d5db", color: "#374151" }
            }
          >
            <Fish
              className="h-4 w-4"
              style={isSaved ? { fill: "#1a3a5c" } : {}}
            />
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Hero image */}
          <div className="h-52 relative bg-gray-100 shrink-0">
            <Image
              src={getCategoryImage(card.tags[0])}
              alt={getCategoryStyle(card.tags[0]).label}
              fill
              className="object-cover"
            />
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Category tags */}
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

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 leading-snug">
              {card.title}
            </h2>

            {/* Meta */}
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              {card.organization && (
                <span className="font-medium text-gray-700">{card.organization}</span>
              )}
              <span className="flex items-center gap-2 text-blue-600">
                <Calendar className="h-4 w-4 shrink-0" />
                {card.date}
              </span>
              {card.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
                  {card.location}
                </span>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Full description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
              {card.descriptionHtml ? (
                <div
                  className="text-sm text-gray-600 leading-relaxed [&_a]:underline [&_a]:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.descriptionHtml) }}
                />
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {card.description || "No description available."}
                </p>
              )}
            </div>

            {/* Similar events */}
            {similarEvents.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Similar Events
                  </h3>
                  <div className="flex flex-col gap-2">
                    {similarEvents.map((similar) => (
                      <SimilarEventMiniCard
                        key={similar.id}
                        card={similar}
                        isSaved={savedIds.has(similar.id)}
                        onToggleSave={onToggleSave}
                        onClick={onSelectCard}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
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


        const kept = data.filter((e) => e.content?.startTime || e.source === "instagram");

        let mapped: EventCard[] = [];

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
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventCard | null>(null);
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
          c.description.toLowerCase().includes(query) ||
          c.tags.some((t) =>
            getCategoryStyle(t).label.toLowerCase().includes(query),
          ),
      )
    : cards;

  const filteredCards = applyEventFilters(
    searchedCards,
    { sortBy, sourceFilter, categoryFilter, dateRange },
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
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />

        {/* Main content + sidebar */}
        <div className="flex gap-6 px-8 pb-8 pt-6 flex-1">
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
            {!loading && !error && filteredCards.length === 0 && (
              <p className="text-gray-400 col-span-3 text-center py-10">
                No events match your filters.
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
                  onClick={setSelectedEvent}
                />
              ))}
          </div>

          {/* Upcoming events */}
          <UpcomingEventsPanel events={upcomingEvents} />
        </div>
      </div>

      {/* Event detail slide-over */}
      {selectedEvent && (
        <EventDetailPanel
          card={selectedEvent}
          allCards={cards}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          onDismiss={() => setSelectedEvent(null)}
          onSelectCard={setSelectedEvent}
        />
      )}

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
