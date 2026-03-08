"use client";

import { useState, useEffect } from "react";

// --- API event shape (from getEventsFromFirestore / hornslink) ---
interface ApiEvent {
  id: string;
  content?: {
    title?: string;
    descriptionText?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
    categories?: string[];
    theme?: string;
    imageUrl?: string | null;
  };
  organization?: { name?: string; id?: string };
}

// --- Types ---
type CommitmentLevel = "High Commitment" | "Medium Commitment" | "Low Commitment";
type Priority = "High Priority" | "Medium Priority" | "Low Priority";

interface Tag {
  label: string;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  commitment: CommitmentLevel;
  tags: Tag[];
  imageUrl?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  priority: Priority;
  time: string;
  location: string;
}

interface User {
  name: string;
  email: string;
  avatarUrl?: string;
  totalCaught: number;
}

// --- Mock Data ---
const mockUser: User = {
  name: "Ashwika Katiyar",
  email: "ashwikakatiyar@gmail.com",
  totalCaught: 4,
};

const mockCards: EventCard[] = [
  {
    id: "1",
    title: "Annual UT Design-A-Thon",
    date: "January 1",
    location: "GDC 2.210",
    description: "Design a product in Figma with teams of 3-5 in 72hrs!",
    commitment: "High Commitment",
    tags: [{ label: "Design" }, { label: "UX/UI" }, { label: "+3 More" }],
  },
  {
    id: "2",
    title: "STEM Career Showcase",
    date: "March 1",
    location: "SZB 5.110",
    description: "Lorem ipsum dolor sit amet consectetur.",
    commitment: "Low Commitment",
    tags: [{ label: "STEM" }, { label: "Career-Orientated" }, { label: "+1 More" }],
  },
  {
    id: "3",
    title: "Longhorn Career Expo",
    date: "February 4",
    location: "JES 2.210A",
    description: "Lorem ipsum dolor sit amet consectetur.",
    commitment: "Low Commitment",
    tags: [{ label: "Business" }, { label: "Career-Orientated" }, { label: "+1 More" }],
  },
  {
    id: "4",
    title: "Business & Tech Talent Fair",
    date: "January 3",
    location: "SZB 3.510",
    description: "Lorem ipsum dolor sit amet consectetur.",
    commitment: "Medium Commitment",
    tags: [{ label: "Tech" }, { label: "Business" }, { label: "+3 More" }],
  },
  {
    id: "5",
    title: "Longhorn Networking Night",
    date: "January 29",
    location: "GSB Atrium",
    description: "Lorem ipsum dolor sit amet consectetur.",
    commitment: "Low Commitment",
    tags: [{ label: "Network" }, { label: "Business" }],
  },
  {
    id: "6",
    title: "LinkedIn & Personal Branding Lab",
    date: "January 1",
    location: "GDC 2.210",
    description: "Lorem ipsum dolor sit amet consectetur.",
    commitment: "High Commitment",
    tags: [{ label: "LinkedIn" }, { label: "Branding" }, { label: "+3 More" }],
  },
];

const mockUpcoming: UpcomingEvent[] = [
  { id: "1", title: "Annual UT Design-A-Thon", priority: "High Priority", time: "Today at 2:00 PM", location: "GDC 2.210" },
  { id: "2", title: "Business & Tech Talent Fair", priority: "High Priority", time: "January 3rd at 5:00 PM", location: "SZB 3.510" },
  { id: "3", title: "Longhorn Networking Night", priority: "Low Priority", time: "January 29th at 4:30 PM", location: "GSB Atrium" },
  { id: "4", title: "STEM Career Showcase", priority: "Medium Priority", time: "February 2nd at 11:00 AM", location: "" },
];

function formatEventDate(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
  } catch {
    return "";
  }
}

function formatEventTime(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function apiEventToEventCard(ev: ApiEvent): EventCard {
  const content = ev.content ?? {};
  const categories = content.categories ?? (content.theme ? [content.theme] : []);
  return {
    id: ev.id,
    title: content.title ?? "Untitled Event",
    date: formatEventDate(content.startTime ?? content.endTime),
    location: content.location ?? "",
    description: content.descriptionText ?? "",
    commitment: "Low Commitment",
    tags: categories.slice(0, 5).map((label) => ({ label })),
    imageUrl: content.imageUrl ?? undefined,
  };
}

function apiEventToUpcoming(ev: ApiEvent): UpcomingEvent {
  const content = ev.content ?? {};
  return {
    id: ev.id,
    title: content.title ?? "Untitled Event",
    priority: "Medium Priority",
    time: formatEventTime(content.startTime),
    location: content.location ?? "",
  };
}

// --- Sub-components ---

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

const commitmentColors: Record<CommitmentLevel, string> = {
  "High Commitment": "bg-red-100 text-red-700",
  "Medium Commitment": "bg-orange-100 text-orange-700",
  "Low Commitment": "bg-green-100 text-green-700",
};

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
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${commitmentColors[card.commitment]}`}>
            {card.commitment}
          </span>
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

const priorityColors: Record<Priority, string> = {
  "High Priority": "bg-amber-100 text-amber-700",
  "Medium Priority": "bg-purple-100 text-purple-700",
  "Low Priority": "bg-green-100 text-green-700",
};

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
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColors[event.priority]}`}>
                {event.priority}
              </span>
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

// --- Page ---
export default function Page() {
  const [cards, setCards] = useState<EventCard[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to load events");
      const data = (await res.json()) as ApiEvent[];
      setCards(data.map(apiEventToEventCard));
      const sorted = [...data].sort((a, b) => {
        const aTime = a.content?.startTime ?? "";
        const bTime = b.content?.startTime ?? "";
        return aTime.localeCompare(bTime);
      });
      setUpcoming(sorted.slice(0, 5).map(apiEventToUpcoming));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCards([]);
      setUpcoming([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar user={mockUser} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex justify-end items-center gap-3 px-8 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
            🐟 {mockUser.totalCaught} Total Caught
          </div>
          <button className="flex items-center gap-1 border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition">
            🇺🇸 English ▾
          </button>
        </header>

        <HeroHeader name={mockUser.name.split(" ")[0]} />

        <SearchAndFilters />

        {/* Main content + sidebar */}
        <div className="flex gap-6 px-8 pb-8 flex-1">
          {/* Cards grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
            {loading && (
              <p className="col-span-full text-gray-500 py-8">Loading events...</p>
            )}
            {error && (
              <div className="col-span-full py-8">
                <p className="text-red-600 mb-2">{error}</p>
                <button
                  type="button"
                  onClick={fetchEvents}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}
            {!loading && !error && cards.map((card) => (
              <EventCardItem key={card.id} card={card} />
            ))}
          </div>

          {/* Upcoming events */}
          <UpcomingEventsPanel events={upcoming} />
        </div>
      </div>
    </div>
  );
}