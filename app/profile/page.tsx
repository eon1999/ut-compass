"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import {
  BookOpen,
  Compass,
  GraduationCap,
  Heart,
  Save,
  Search,
  Settings,
  Target,
  UserRound,
  X,
} from "lucide-react";

type OnboardingSubmission = {
  firstName: string;
  lastName: string;
  yearClassification: string;
  major: string;
  preferredCreditLoad: string;
  studyStyle: string;
  interests: string[];
  communityPreference: string;
  topGoal: string;
  weeklyAvailability: string;
};

type AuthProfile = {
  name: string;
  email: string;
};

type ProfilePreferences = {
  academicInterests: string[];
  preProfessionalAspirations: string[];
  hobbies: string[];
  organizations: string[];
  schoolYearGoal: string;
};

type ProfileData = {
  name: string;
  email: string;
  studentYear: string;
  major: string;
  preferences: ProfilePreferences;
};

const ONBOARDING_STORAGE_KEY = "ut-compass-onboarding-submission";
const AUTH_PROFILE_STORAGE_KEY = "ut-compass-auth-profile";
const PROFILE_STORAGE_KEY = "ut-compass-profile-settings";

const studentYearOptions = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate Student",
];

const majorOptions = [
  "Computer Science",
  "Electrical Engineering",
  "Business",
  "Biology",
  "Psychology",
  "Undeclared",
];

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const titleCase = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const createInitialProfile = (): ProfileData => {
  if (typeof window === "undefined") {
    return {
      name: "",
      email: "",
      studentYear: "",
      major: "",
      preferences: {
        academicInterests: [],
        preProfessionalAspirations: [],
        hobbies: [],
        organizations: [],
        schoolYearGoal: "",
      },
    };
  }

  const savedProfile = safeParse<ProfileData>(
    window.localStorage.getItem(PROFILE_STORAGE_KEY),
  );
  if (savedProfile) {
    return savedProfile;
  }

  const onboarding = safeParse<OnboardingSubmission>(
    window.localStorage.getItem(ONBOARDING_STORAGE_KEY),
  );
  const authProfile = safeParse<AuthProfile>(
    window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY),
  );

  const onboardingName =
    onboarding?.firstName && onboarding?.lastName
      ? `${onboarding.firstName} ${onboarding.lastName}`
      : "";

  return {
    name: authProfile?.name || onboardingName,
    email: authProfile?.email || "",
    studentYear: onboarding?.yearClassification || "",
    major: onboarding?.major || "",
    preferences: {
      academicInterests: onboarding?.interests || [],
      preProfessionalAspirations: [],
      hobbies: [],
      organizations: [],
      schoolYearGoal: onboarding?.topGoal || "",
    },
  };
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(() => createInitialProfile());
  const [academicInterestInput, setAcademicInterestInput] = useState("");
  const [aspirationInput, setAspirationInput] = useState("");
  const [hobbyInput, setHobbyInput] = useState("");
  const [organizationInput, setOrganizationInput] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const updateProfileField = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K],
  ) => {
    setProfile((previousData) => ({
      ...previousData,
      [key]: value,
    }));
  };

  const addTag = (
    key: keyof ProfilePreferences,
    rawValue: string,
    clearInput: () => void,
  ) => {
    const normalizedValue = titleCase(rawValue.trim());
    if (!normalizedValue) {
      return;
    }

    setProfile((previousData) => {
      const current = previousData.preferences[key];
      if (!Array.isArray(current)) {
        return previousData;
      }

      if (current.some((item) => item.toLowerCase() === normalizedValue.toLowerCase())) {
        return previousData;
      }

      return {
        ...previousData,
        preferences: {
          ...previousData.preferences,
          [key]: [...current, normalizedValue],
        },
      };
    });
    clearInput();
  };

  const removeTag = (key: keyof ProfilePreferences, value: string) => {
    setProfile((previousData) => {
      const current = previousData.preferences[key];
      if (!Array.isArray(current)) {
        return previousData;
      }

      return {
        ...previousData,
        preferences: {
          ...previousData.preferences,
          [key]: current.filter((item) => item !== value),
        },
      };
    });
  };

  const handleTagInput = (
    event: KeyboardEvent<HTMLInputElement>,
    key: keyof ProfilePreferences,
    value: string,
    clearInput: () => void,
  ) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addTag(key, value, clearInput);
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setSaveMessage("Changes saved");
    window.setTimeout(() => setSaveMessage(""), 2500);
  };

  const renderTagList = (items: string[], key: keyof ProfilePreferences) => (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length > 0 ? (
        items.map((item) => (
          <button
            key={`${key}-${item}`}
            type="button"
            onClick={() => removeTag(key, item)}
            className="inline-flex items-center gap-2 rounded-full bg-[#23395d] px-3 py-1.5 text-sm text-white"
          >
            {item}
            <X className="h-3.5 w-3.5" />
          </button>
        ))
      ) : (
        <p className="text-sm text-gray-500">No selections yet.</p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f4f4f6] text-gray-900 lg:flex">
      <aside className="flex w-full flex-col border-b border-gray-200 bg-white p-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
        <div className="inline-flex items-center gap-2 text-2xl font-semibold text-[#1d4d8f]">
          <Compass className="h-7 w-7" />
          UT Compass
        </div>

        <nav className="mt-8 space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <BookOpen className="h-4 w-4" />
            Dashboard
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Heart className="h-4 w-4" />
            Your Saved
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl bg-[#f2e6b8] px-4 py-3 text-left text-sm font-semibold text-gray-800"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>

        <div className="mt-8 border-t border-gray-200 pt-6 lg:mt-auto">
          <div className="text-sm font-semibold">{profile.name || "Your Profile"}</div>
          <div className="truncate text-xs text-gray-500">{profile.email || "No email yet"}</div>
        </div>
      </aside>

      <section className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clubs, events, and more..."
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1d4d8f]"
              />
            </div>
            <div className="text-sm text-gray-500">Settings</div>
          </header>

          <form onSubmit={handleSave} className="space-y-8">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h1 className="text-3xl font-semibold">Personal Information</h1>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Name</span>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(event) => updateProfileField("name", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#1d4d8f]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => updateProfileField("email", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#1d4d8f]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Student Year</span>
                  <select
                    value={profile.studentYear}
                    onChange={(event) =>
                      updateProfileField("studentYear", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#1d4d8f]"
                  >
                    <option value="">Select year</option>
                    {studentYearOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Major</span>
                  <select
                    value={profile.major}
                    onChange={(event) => updateProfileField("major", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#1d4d8f]"
                  >
                    <option value="">Select major</option>
                    {majorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">Preferences</h2>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Academic Interests
                  </label>
                  <input
                    type="text"
                    value={academicInterestInput}
                    onChange={(event) => setAcademicInterestInput(event.target.value)}
                    onKeyDown={(event) =>
                      handleTagInput(
                        event,
                        "academicInterests",
                        academicInterestInput,
                        () => setAcademicInterestInput(""),
                      )
                    }
                    placeholder="Type and press Enter"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-[#1d4d8f]"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        addTag(
                          "academicInterests",
                          academicInterestInput,
                          () => setAcademicInterestInput(""),
                        )
                      }
                      className="text-sm font-medium text-[#1d4d8f]"
                    >
                      Add academic interest
                    </button>
                  </div>
                  {renderTagList(
                    profile.preferences.academicInterests,
                    "academicInterests",
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Pre-Professional Aspirations
                  </label>
                  <input
                    type="text"
                    value={aspirationInput}
                    onChange={(event) => setAspirationInput(event.target.value)}
                    onKeyDown={(event) =>
                      handleTagInput(event, "preProfessionalAspirations", aspirationInput, () =>
                        setAspirationInput(""),
                      )
                    }
                    placeholder="Type and press Enter"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-[#1d4d8f]"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        addTag("preProfessionalAspirations", aspirationInput, () =>
                          setAspirationInput(""),
                        )
                      }
                      className="text-sm font-medium text-[#1d4d8f]"
                    >
                      Add aspiration
                    </button>
                  </div>
                  {renderTagList(
                    profile.preferences.preProfessionalAspirations,
                    "preProfessionalAspirations",
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Hobbies</label>
                  <input
                    type="text"
                    value={hobbyInput}
                    onChange={(event) => setHobbyInput(event.target.value)}
                    onKeyDown={(event) =>
                      handleTagInput(event, "hobbies", hobbyInput, () => setHobbyInput(""))
                    }
                    placeholder="Type and press Enter"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-[#1d4d8f]"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => addTag("hobbies", hobbyInput, () => setHobbyInput(""))}
                      className="text-sm font-medium text-[#1d4d8f]"
                    >
                      Add hobby
                    </button>
                  </div>
                  {renderTagList(profile.preferences.hobbies, "hobbies")}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Organizations
                  </label>
                  <input
                    type="text"
                    value={organizationInput}
                    onChange={(event) => setOrganizationInput(event.target.value)}
                    onKeyDown={(event) =>
                      handleTagInput(event, "organizations", organizationInput, () =>
                        setOrganizationInput(""),
                      )
                    }
                    placeholder="Type and press Enter"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-[#1d4d8f]"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        addTag("organizations", organizationInput, () =>
                          setOrganizationInput(""),
                        )
                      }
                      className="text-sm font-medium text-[#1d4d8f]"
                    >
                      Add organization
                    </button>
                  </div>
                  {renderTagList(profile.preferences.organizations, "organizations")}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold">
                <Target className="h-5 w-5" />
                Goals
              </h2>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-gray-700">School year goal</span>
                <textarea
                  value={profile.preferences.schoolYearGoal}
                  onChange={(event) =>
                    setProfile((previousData) => ({
                      ...previousData,
                      preferences: {
                        ...previousData.preferences,
                        schoolYearGoal: event.target.value,
                      },
                    }))
                  }
                  placeholder="Describe what success looks like this school year."
                  className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#1d4d8f]"
                />
              </label>
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <UserRound className="h-4 w-4" />
                Hydrated from login + onboarding when available
              </div>
              <div className="flex items-center gap-3">
                {saveMessage && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {saveMessage}
                  </span>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8bd6cc] px-5 py-3 font-semibold text-[#123b45] transition hover:bg-[#78c8bc]"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </footer>
          </form>
        </div>
      </section>
    </main>
  );
}