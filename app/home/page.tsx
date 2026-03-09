"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";


interface Tag {
  label: string;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
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
  source: "hornslink" | "manual";
  scraped_at: string;
  content: {
    title: string;
    description: string;
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

function Sidebar({ user }: { user: User }) {
  const [active, setActive] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "saved", label: "Your Saved", icon: "🔖" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col justify-between py-6 px-4">
      {/* Logo */}
      <div>
        <div className="flex items-center gap-2 mb-10 px-2">
          {/* Replace with actual logo */}
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
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
                active === item.id
                  ? "bg-amber-100 text-amber-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* User Profile */}
      <div className="flex flex-col gap-3 px-2">
        <div className="flex items-center gap-3">
          {/* Replace with actual avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
            👤
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 border border-gray-300 rounded-lg py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            Edit Profile
          </button>
          <button className="flex-1 bg-blue-900 text-white rounded-lg py-1.5 text-sm hover:bg-blue-800 transition">
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

function HeroHeader({ name }: { name: string }) {
  return (
    <div className="w-full h-40 bg-gradient-to-r from-blue-900 to-blue-600 flex items-center px-8 rounded-b-none">
      {/* TODO: Add wave SVG background illustration */}
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

function EventCardItem({ card }: { card: EventCard }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image placeholder */}
      <div className="h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
        {/* Replace with <Image> */}
        [Event Image]
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {card.tags.map((tag) => (
            <span key={tag.label} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              {tag.label}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug">{card.title}</h3>

        {/* Date & Location */}
        <div className="flex flex-col gap-1 text-xs text-blue-600">
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
    date: formattedDate,
    location: event.content.location,
    description: event.content.description,
    tags: [
      { label: primaryCategory },
      ...topTags,
    ],
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

  const currentUser: User = {
    name: user?.displayName ?? user?.email ?? "Student",
    email: user?.email ?? "",
    avatarUrl: user?.photoURL ?? undefined,
    totalCaught: 0,
  };

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

        <HeroHeader name={currentUser.name.split(" ")[0]} />

        <SearchAndFilters />

        {/* Main content + sidebar */}
        <div className="flex gap-6 px-8 pb-8 flex-1">
          {/* Cards grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
            {loading && <p className="text-gray-400 col-span-3 text-center py-10">Loading events...</p>}
            {error && <p className="text-red-500 col-span-3 text-center py-10">{error}</p>}
            {!loading && !error && cards.map((card) => (
              <EventCardItem key={card.id} card={card} />
            ))}
          </div>

          {/* Upcoming events */}
          <UpcomingEventsPanel events={[]} />
        </div>
      </div>
    </div>
  );
}