"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/context/AuthContext";
import { House, Fish, Settings, User, Camera } from "lucide-react";
import Image from "next/image";

type UserProfile = {
  firstName: string;
  lastName: string;
  yearClassification: string;
  school: string;
  major: string;
  interests: string[];
  goals: string[];
  hobbies: string[];
  submittedAt: string;
  avatarUrl?: string;
};

interface SidebarUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

function Sidebar({ user }: { user: SidebarUser }) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: House, route: "/home" },
    { id: "saved", label: "Your Saved", icon: Fish, route: "/saved" },
    { id: "settings", label: "Settings", icon: Settings, route: "/profile" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 mb-10 px-2 text-blue-900">
        <div className="relative h-10 w-10 overflow-hidden">
          <Image src="/ut-compass.svg" alt="UT Compass logo" fill className="object-cover scale-120 origin-center" />
        </div>
        <span className="text-xl font-more-sugar font-bold">UT Compass</span>
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
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt="Profile" width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <User className="h-6 w-6" />
            )}
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

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior"];

const INTEREST_OPTIONS = [
  "Mechanical Engineering", "Software Development", "UX/UI Design", "Politics",
  "Business Administration", "Architecture", "Informatics", "Nursing",
  "Education", "Liberal Arts", "Fine Arts", "Communications", "Mathematics", "Product Management",
];

const GOAL_OPTIONS = [
  "Gaining technical skills", "Seeking internships", "Research opportunities",
  "Leadership positions", "Pre-law", "Pre-health", "Certifications",
  "On-site training", "Build a startup", "Connect with peers", "Interview practice", "Industry experience",
];

const HOBBY_OPTIONS = [
  "Playing music", "Drawing/painting", "Reading", "Socializing",
  "Crocheting", "Cafe-hopping", "Hiking", "Running",
];

const schoolOptions: Record<string, string[]> = {
  "School of Architecture": ["Architectural Studies", "Architecture", "Architecture/Architectural Engineering", "Interior Design"],
  "McCombs School of Business": ["Accounting", "Business Analytics", "Canfield Business Honors Program", "Finance", "International Business", "Management", "Management Information Systems", "Marketing", "Supply Chain Management"],
  "School of Civic Leadership": ["Civics Honors", "Great Books Honors", "Strategy and Statecraft"],
  "Moody College of Communication": ["Advertising", "Communication and Leadership", "Communication Studies", "Journalism", "Public Relations", "Radio-Television-Film", "Speech, Language, and Hearing Sciences", "Undeclared (Communication)"],
  "College of Education": ["Education", "Kinesiology and Health", "Athletic Training"],
  "Cockrell School of Engineering": ["Aerospace Engineering", "Architectural Engineering", "Biomedical Engineering", "Chemical Engineering", "Civil Engineering", "Computational Engineering", "Electrical and Computer Engineering", "Environmental Engineering", "Geosystems Engineering", "Mechanical Engineering", "Petroleum Engineering"],
  "College of Fine Arts": ["Acting", "Art Education", "Art History", "Arts and Entertainment Technologies", "Dance", "Dance Education", "Design", "Jazz", "Music", "Music Composition", "Music Performance", "Music Studies", "Studio Art", "Theatre & Dance, Dance", "Theatre & Dance, Theatre", "Theatre Education"],
  "Jackson School of Geosciences": ["Climate System Science", "Environmental Science", "General Geology", "Geophysics", "Geosciences", "Geosciences (Teaching)", "Geosystems Engineering", "Hydrology and Water Resources"],
  "School of Information": ["Informatics"],
  "College of Liberal Arts": ["African and African Diaspora Studies", "American Studies", "Anthropology", "Asian American Studies", "Asian Cultures and Languages", "Asian Studies", "Behavioral and Social Data Science", "Classical Languages", "Classical Studies", "Economics", "English", "Environmental Science", "European Studies", "French Studies", "Geography", "German", "Government", "Health & Society", "History", "Human Dimensions of Organizations", "Humanities", "International Relations and Global Studies", "Italian", "Jewish Studies", "Latin American Studies", "Linguistics", "Mexican American and Latina/o Studies", "Middle Eastern Studies", "Philosophy", "Plan II Honors Program", "Psychology", "Race, Indigeneity, and Migration", "Religious Studies", "Rhetoric and Writing", "Russian, East European and Eurasian Studies", "Sociology", "Spanish", "Sustainability Studies", "Undeclared (Liberal Arts)", "Urban Studies", "Women's and Gender Studies"],
  "College of Natural Sciences": ["Astronomy", "Biochemistry", "Biology", "Chemistry", "Computer Science", "Environmental Science", "Human Development and Family Sciences", "Human Ecology", "Mathematics", "Medical Laboratory Science", "Neuroscience", "Nutrition", "Physics", "Pre-Pharmacy", "Public Health", "Statistics and Data Science", "Textiles and Apparel", "Undeclared (Natural Sciences)"],
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [yearClassification, setYearClassification] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  const availableMajors = useMemo(() => schoolOptions[school] ?? [], [school]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/signup");
      return;
    }

    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setYearClassification(data.yearClassification);
        setSchool(data.school);
        setMajor(data.major);
        setInterests(data.interests ?? []);
        setGoals(data.goals ?? []);
        setHobbies(data.hobbies ?? []);
        setAvatarUrl(data.avatarUrl);
      }
      setFetching(false);
    });
  }, [user, loading, router]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), { avatarUrl: url });
      setAvatarUrl(url);
      setProfile((prev) => prev ? { ...prev, avatarUrl: url } : prev);
    } finally {
      setUploadingPhoto(false);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  }

  async function handleSave() {
    if (!user || !profile) return;
    setSaving(true);
    await updateDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      yearClassification,
      school,
      major,
      interests,
      goals,
      hobbies,
    });
    setProfile((prev) => prev ? { ...prev, firstName, lastName, yearClassification, school, major, interests, goals, hobbies } : prev);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const currentUser: SidebarUser = {
    name: user?.displayName ?? user?.email ?? "Student",
    email: user?.email ?? "",
    avatarUrl,
  };

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen bg-gray-50 font-sans">
        <Sidebar user={currentUser} />
        <div className="flex flex-col flex-1 items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen bg-gray-50 font-sans">
        <Sidebar user={currentUser} />
        <div className="flex flex-col flex-1 items-center justify-center gap-4">
          <p className="text-gray-600">No profile found. Complete onboarding first.</p>
          <button
            onClick={() => router.push("/onboarding")}
            className="rounded-xl bg-blue-900 px-5 py-2 text-white hover:bg-blue-800"
          >
            Go to onboarding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar user={currentUser} />

      <div className="flex flex-col flex-1 min-w-0 px-10 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Personal Information */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex gap-8 items-start">
              {/* Profile picture */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-12 w-12" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-blue-900 hover:bg-blue-800 text-white rounded-full flex items-center justify-center shadow transition disabled:opacity-60"
                    aria-label="Change profile picture"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                {uploadingPhoto && (
                  <span className="text-xs text-gray-400">Uploading...</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Email</label>
                  <input
                    type="text"
                    value={user?.email ?? ""}
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">School</label>
                  <select
                    value={school}
                    onChange={(e) => { setSchool(e.target.value); setMajor(""); }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    <option value="">Select school</option>
                    {Object.keys(schoolOptions).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Student Year</label>
                  <select
                    value={yearClassification}
                    onChange={(e) => setYearClassification(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Major</label>
                  <select
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    disabled={!school}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Select major</option>
                    {availableMajors.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {major && !availableMajors.includes(major) && (
                      <option value={major}>{major}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Preferences</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Academic Interests</h3>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((item) => {
                  const selected = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setInterests((prev) => selected ? prev.filter((i) => i !== item) : [...prev, item])}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                        selected
                          ? "bg-blue-900 text-white border-blue-900"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-900 hover:text-blue-900"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Pre-Professional Aspirations</h3>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((item) => {
                  const selected = goals.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setGoals((prev) => selected ? prev.filter((g) => g !== item) : [...prev, item])}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                        selected
                          ? "bg-blue-900 text-white border-blue-900"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-900 hover:text-blue-900"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Hobbies</h3>
              <div className="flex flex-wrap gap-2">
                {HOBBY_OPTIONS.map((item) => {
                  const selected = hobbies.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setHobbies((prev) => selected ? prev.filter((h) => h !== item) : [...prev, item])}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                        selected
                          ? "bg-blue-900 text-white border-blue-900"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-900 hover:text-blue-900"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-400 hover:bg-teal-500 text-navy font-semibold px-8 py-3 rounded-xl transition disabled:opacity-60"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
