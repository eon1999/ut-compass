"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

import { auth } from "@/lib/firebaseConfig";
import {
  GOAL_OPTIONS,
  HOBBY_OPTIONS,
  INTEREST_OPTIONS,
  STUDENT_YEAR_OPTIONS,
  defaultUserProfile,
  mergeUserProfiles,
  profileFromAuthUser,
  profileFromOnboarding,
  readOnboardingSubmissionFromLocalStorage,
  readProfileFromLocalStorage,
  type UserProfile,
  writeProfileToLocalStorage,
} from "@/lib/profile";
import {
  getProfileFromFirestore,
  upsertProfileToFirestore,
} from "@/lib/profileFirestore";

type TagEditorProps = {
  label: string;
  values: string[];
  placeholder: string;
  suggestions?: string[];
  onChange: (values: string[]) => void;
};

function TagEditor({
  label,
  values,
  placeholder,
  suggestions = [],
  onChange,
}: TagEditorProps) {
  const [input, setInput] = useState("");

  const addTag = (rawTag: string) => {
    const normalized = rawTag.trim();
    if (!normalized) {
      return;
    }

    if (values.includes(normalized)) {
      setInput("");
      return;
    }

    onChange([...values, normalized]);
    setInput("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(values.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(input);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700"
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Add
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions
            .filter((suggestion) => !values.includes(suggestion))
            .map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700 transition hover:bg-blue-100"
              >
                {suggestion}
              </button>
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <p className="text-sm text-gray-500">No items added yet.</p>
        ) : (
          values.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full bg-[#23395d] px-3 py-1 text-sm text-white"
            >
              {tag} <span aria-hidden="true">×</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return;
      }

      setAuthUser(user);
      setIsLoading(true);
      setSyncMessage("");

      const onboardingProfile = profileFromOnboarding(
        readOnboardingSubmissionFromLocalStorage(),
      );
      const localProfile = readProfileFromLocalStorage();
      let firestoreProfile: Partial<UserProfile> | null = null;

      if (user) {
        try {
          firestoreProfile = await getProfileFromFirestore(user.uid);
        } catch (error) {
          console.error("Failed to fetch profile from Firestore:", error);
        }
      }

      if (!isMounted) {
        return;
      }

      const hydratedProfile = mergeUserProfiles(
        onboardingProfile,
        profileFromAuthUser(user),
        firestoreProfile,
        localProfile,
      );

      setProfile(hydratedProfile);
      writeProfileToLocalStorage(hydratedProfile);

      if (user) {
        try {
          await upsertProfileToFirestore(user.uid, hydratedProfile);
          if (isMounted) {
            setSyncMessage("Profile synced with Firebase.");
          }
        } catch (error) {
          console.error("Failed to migrate profile data to Firestore:", error);
          if (isMounted) {
            setSyncMessage("Loaded profile locally. Firebase sync is unavailable.");
          }
        }
      } else {
        setSyncMessage("Loaded local profile. Sign in to save to Firebase.");
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const fullName = useMemo(() => {
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }

    return profile.displayName || "Student";
  }, [profile.displayName, profile.firstName, profile.lastName]);

  const updateProfileField = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) => {
    setProfile((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSyncMessage("");

    const normalizedProfile = mergeUserProfiles({
      ...profile,
      updatedAt: new Date().toISOString(),
    });

    setProfile(normalizedProfile);
    writeProfileToLocalStorage(normalizedProfile);

    if (authUser) {
      try {
        await upsertProfileToFirestore(authUser.uid, normalizedProfile);
        setSyncMessage("Saved profile to local storage and Firebase.");
      } catch (error) {
        console.error("Failed to save profile to Firestore:", error);
        setSyncMessage("Saved profile locally, but Firebase sync failed.");
      }
    } else {
      setSyncMessage("Saved profile locally. Log in to sync with Firebase.");
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f4f6] p-6 md:p-10">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-500">Loading your profile data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f6] p-6 md:p-10">
      <form
        onSubmit={handleSave}
        className="mx-auto max-w-4xl space-y-8 rounded-2xl bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-600">
            Manage your personal information and preferences.
          </p>
          <p className="text-sm text-gray-500">Signed in as {fullName}</p>
          {syncMessage && (
            <p className="text-sm font-medium text-blue-700">{syncMessage}</p>
          )}
        </div>

        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-gray-900">
            Personal Information
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                First name
              </span>
              <input
                value={profile.firstName}
                onChange={(event) =>
                  updateProfileField("firstName", event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Last name</span>
              <input
                value={profile.lastName}
                onChange={(event) =>
                  updateProfileField("lastName", event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  updateProfileField("email", event.target.value)
                }
                disabled={Boolean(authUser?.email)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700 disabled:bg-gray-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Student year
              </span>
              <select
                value={profile.studentYear}
                onChange={(event) =>
                  updateProfileField("studentYear", event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700"
              >
                <option value="">Select your year</option>
                {STUDENT_YEAR_OPTIONS.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">School</span>
              <input
                value={profile.school}
                onChange={(event) => updateProfileField("school", event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Major</span>
              <input
                value={profile.major}
                onChange={(event) => updateProfileField("major", event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-700"
              />
            </label>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
          <TagEditor
            label="Academic interests"
            values={profile.interests}
            suggestions={INTEREST_OPTIONS}
            placeholder="Add an interest"
            onChange={(values) => updateProfileField("interests", values)}
          />
          <TagEditor
            label="Pre-professional aspirations"
            values={profile.goals}
            suggestions={GOAL_OPTIONS}
            placeholder="Add a goal"
            onChange={(values) => updateProfileField("goals", values)}
          />
          <TagEditor
            label="Hobbies"
            values={profile.hobbies}
            suggestions={HOBBY_OPTIONS}
            placeholder="Add a hobby"
            onChange={(values) => updateProfileField("hobbies", values)}
          />
          <TagEditor
            label="Organizations"
            values={profile.organizations}
            placeholder="Add an organization"
            onChange={(values) => updateProfileField("organizations", values)}
          />
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#7bd5cc] px-6 py-3 font-semibold text-[#17404c] transition hover:bg-[#6cc4bb] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}