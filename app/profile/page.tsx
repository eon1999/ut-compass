"use client";

import { useEffect, useRef, useState } from "react";
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

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];
const MAJOR_OPTIONS = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Business Administration",
  "Psychology",
  "Biology",
  "Economics",
  "Mathematics",
  "Communication",
  "Architecture",
];

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
  const [major, setMajor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

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
        setMajor(data.major);
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
      major,
    });
    setProfile((prev) => prev ? { ...prev, firstName, lastName, yearClassification, major } : prev);
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
                  <input
                    type="text"
                    value={profile.school}
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                  />
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
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    {MAJOR_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {!MAJOR_OPTIONS.includes(major) && (
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Academic Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((item) => (
                  <span key={item} className="bg-blue-900 text-white text-sm font-medium px-4 py-1.5 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Pre-Professional Aspirations</h3>
              <div className="flex flex-wrap gap-2">
                {profile.goals.map((item) => (
                  <span key={item} className="bg-blue-900 text-white text-sm font-medium px-4 py-1.5 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Hobbies</h3>
              <div className="flex flex-wrap gap-2">
                {profile.hobbies.map((item) => (
                  <span key={item} className="bg-blue-900 text-white text-sm font-medium px-4 py-1.5 rounded-full">
                    {item}
                  </span>
                ))}
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
