"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/context/AuthContext";

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
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/signup");
      return;
    }

    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
      setFetching(false);
    });
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-gray-600">No profile found. Complete onboarding first.</p>
        <button
          onClick={() => router.push("/onboarding")}
          className="rounded-xl bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          Go to onboarding
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="mt-1 text-gray-500">{profile.yearClassification} · {profile.school}</p>
        <p className="text-gray-500">{profile.major}</p>

        <div className="mt-6 space-y-4">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Interests</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.interests.map((item) => (
                <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Career Goals</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.goals.map((item) => (
                <span key={item} className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Hobbies</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.hobbies.map((item) => (
                <span key={item} className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700">
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>

        <button
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          Home
        </button>
      </div>
    </main>
  );
}
