"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { doc, getDoc, arrayUnion, arrayRemove, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Tag {
  label: string;
}

interface EventCard {
  id: string;
  title: string;
  organization: string;
  date: string;
  startTime: Date;
  location: string;
  description: string;
  tags: Tag[];
  imageUrl?: string;
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
  totalCaught: number;
}

interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface DBEvent {
  id: string;
  src: string;
  source?: "hornslink" | "manual";
  scraped_at?: string;
  organization?: { name: string; id: string };
  content: {
    title: string;
    description: string;
    org_name?: string;
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

function Sidebar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", route: "/home" },
    { id: "saved", label: "Your Saved", icon: "🔖", route: "/saved" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-sm">
          🧭
        </div>
        <span className="text-xl font-bold text-blue-900">UT Compass</span>
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
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Profile */}
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
          <button className="flex-1 border border-gray-300 rounded-lg py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition"
                  onClick={() => router.push("/profile")}>
            Edit Profile
          </button>
          <button className="flex-1 bg-blue-900 text-white rounded-lg py-1.5 text-sm hover:bg-blue-800 transition"
                  onClick={() => router.push("..")}>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header({ name }: { name: string }) {
  return (
    <div className="w-full h-40 bg-gradient-to-r from-blue-900 to-blue-600 flex items-center px-8 rounded-b-none">
      {/* TODO: Add background illustration */}
      <h1 className="text-4xl font-bold text-white">Ahoy, {name}!</h1>
    </div>
  );
}

function SearchAndFilters() {
  return (
    <div className="flex gap-3 flex-wrap px-8 py-5">
      <input
        type="text"
        placeholder="Search Clubs, Events, and More..."
        className="flex-1 min-w-48 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
      />
      {["Commitment", "Priority", "Interests"].map((filter) => (
        <button
          key={filter}
          className="flex items-center gap-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          {filter} <span className="text-gray-400">▾</span>
        </button>
      ))}
      <button className="flex items-center gap-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
        Exclude Conflicting 👁
      </button>
    </div>
  );
}

function EventCardItem({ card, isSaved, onToggleSave }: { card: EventCard; isSaved: boolean; onToggleSave: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image placeholder */}
      <div className="h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
        {/* Replace with <Image> */}
        [Event Image]
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Tags + bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span key={tag.label} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {tag.label}
              </span>
            ))}
          </div>
          <button
            onClick={() => onToggleSave(card.id)}
            className="shrink-0 text-lg leading-none"
            aria-label={isSaved ? "Unsave event" : "Save event"}
          >
            {isSaved ? "🎣" : "🐟"}
          </button>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug">{card.title}</h3>

        {/* Organization Name */}
        <h4 className="text-xs text-gray-700 text-base">{card.organization}</h4>

        {/* Date & Location */}
        <div className="flex flex-col gap-1 text-xs text-blue-600">
          {/* Replace with illustration */}
          <span>📅 {card.date}</span>
          <span>📍 {card.location}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
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
          <span className="text-gray-400">📅</span>
        </div>

        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div key={event.id} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition cursor-pointer">
              <p className="font-semibold text-sm text-gray-800 mb-2 leading-snug">{event.title}</p>
              <div className="mt-2 flex flex-col gap-0.5 text-xs text-gray-500">
                <span>📅 {event.time}</span>
                {event.location && <span>📍 {event.location}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
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

  return {
    id: event.id,
    title: event.content.title,
    organization: event.organization?.name ?? event.content.org_name ?? "",
    date: formattedDate,
    startTime: date,
    location: event.content.location,
    description: event.content.description,
    tags: [
      { label: primaryCategory },
      ...topTags,
    ],
  };
}

function useSavedEvents(userId: string | undefined) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    getDoc(userRef).then((snap) => {
      const data = snap.data();
      if (data?.savedEventIds) {
        setSavedIds(new Set(data.savedEventIds));
      }
    });
  }, [userId]);

  async function toggleSave(eventId: string) {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    const isSaved = savedIds.has(eventId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
    try {
      await setDoc(userRef, { savedEventIds: isSaved ? arrayRemove(eventId) : arrayUnion(eventId) }, { merge: true });
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

  return { savedIds, toggleSave };
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
        setCards(data.map(mapDBEventToCard));
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

export default function Page() {
  const { cards, loading, error } = useEvents();
  const { user } = useAuth();
  const { savedIds, toggleSave } = useSavedEvents(user?.uid);

  const currentUser: User = {
    name: user?.displayName ?? user?.email ?? "Student",
    email: user?.email ?? "",
    avatarUrl: user?.photoURL ?? undefined,
    totalCaught: 0,
  };

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingEvents: UpcomingEvent[] = cards
    .filter((c) => savedIds.has(c.id) && c.startTime >= now && c.startTime <= sevenDaysLater)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .map((c) => ({
      id: c.id,
      title: c.title,
      time: c.date,
      location: c.location,
    }));

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar user={currentUser} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex justify-end items-center gap-3 px-8 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
            🐟 {currentUser.totalCaught} Total Caught
          </div>
          <button className="flex items-center gap-1 border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition">
            🇺🇸 English ▾
          </button>
        </header>

        <Header name={currentUser.name.split(" ")[0]} />

        <SearchAndFilters />

        {/* Main content + sidebar */}
        <div className="flex gap-6 px-8 pb-8 flex-1">
          {/* Cards grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
            {loading && <p className="text-gray-400 col-span-3 text-center py-10">Loading events...</p>}
            {error && <p className="text-red-500 col-span-3 text-center py-10">{error}</p>}
            {!loading && !error && cards.map((card) => (
              <EventCardItem key={card.id} card={card} isSaved={savedIds.has(card.id)} onToggleSave={toggleSave} />
            ))}
          </div>

          {/* Upcoming events */}
          <UpcomingEventsPanel events={upcomingEvents} />
        </div>
      </div>
    </div>
  );
}