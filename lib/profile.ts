import type { User } from "firebase/auth";

export const ONBOARDING_DRAFT_STORAGE_KEY = "ut-compass-onboarding-draft";
export const ONBOARDING_SUBMISSION_STORAGE_KEY =
  "ut-compass-onboarding-submission";
export const PROFILE_STORAGE_KEY = "ut-compass-profile";

export type OnboardingFormData = {
  firstName: string;
  lastName: string;
  yearClassification: string;
  school: string;
  major: string;
  interests: string[];
  goals: string[];
  hobbies: string[];
  communityPreference: string;
  topGoal: string;
  weeklyAvailability: string;
};

export type OnboardingSubmission = OnboardingFormData & {
  submittedAt?: string;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  firstName: string;
  lastName: string;
  studentYear: string;
  school: string;
  major: string;
  interests: string[];
  goals: string[];
  hobbies: string[];
  organizations: string[];
  updatedAt?: string;
};

export const STUDENT_YEAR_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
];

export const INTEREST_OPTIONS = [
  "Mechanical Engineering",
  "Software Development",
  "UX/UI Design",
  "Politics",
  "Business Administration",
  "Architecture",
  "Informatics",
  "Nursing",
  "Education",
  "Liberal Arts",
  "Fine Arts",
  "Communications",
  "Mathematics",
  "Product Management",
];

export const GOAL_OPTIONS = [
  "Gaining technical skills",
  "Seeking internships",
  "Research opportunities",
  "Leadership positions",
  "Pre-law",
  "Pre-health",
  "Certifications",
  "On-site training",
  "Build a startup",
  "Connect with peers",
  "Interview practice",
  "Industry experience",
];

export const HOBBY_OPTIONS = [
  "Playing music",
  "Drawing/painting",
  "Reading",
  "Socializing",
  "Crocheting",
  "Cafe-hopping",
  "Hiking",
  "Running",
];

export const defaultUserProfile: UserProfile = {
  uid: "",
  displayName: "",
  email: "",
  firstName: "",
  lastName: "",
  studentYear: "",
  school: "",
  major: "",
  interests: [],
  goals: [],
  hobbies: [],
  organizations: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const dedupeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const toTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export function mergeUserProfiles(
  ...profiles: Array<Partial<UserProfile> | null | undefined>
): UserProfile {
  const merged: UserProfile = { ...defaultUserProfile };

  for (const profile of profiles) {
    if (!profile) {
      continue;
    }

    const uid = toTrimmedString(profile.uid);
    const displayName = toTrimmedString(profile.displayName);
    const email = toTrimmedString(profile.email);
    const firstName = toTrimmedString(profile.firstName);
    const lastName = toTrimmedString(profile.lastName);
    const studentYear = toTrimmedString(profile.studentYear);
    const school = toTrimmedString(profile.school);
    const major = toTrimmedString(profile.major);
    const updatedAt = toTrimmedString(profile.updatedAt);

    if (uid) merged.uid = uid;
    if (displayName) merged.displayName = displayName;
    if (email) merged.email = email;
    if (firstName) merged.firstName = firstName;
    if (lastName) merged.lastName = lastName;
    if (studentYear) merged.studentYear = studentYear;
    if (school) merged.school = school;
    if (major) merged.major = major;
    if (updatedAt) merged.updatedAt = updatedAt;

    const interests = dedupeStringArray(profile.interests);
    const goals = dedupeStringArray(profile.goals);
    const hobbies = dedupeStringArray(profile.hobbies);
    const organizations = dedupeStringArray(profile.organizations);

    if (interests.length) merged.interests = interests;
    if (goals.length) merged.goals = goals;
    if (hobbies.length) merged.hobbies = hobbies;
    if (organizations.length) merged.organizations = organizations;
  }

  if (!merged.displayName && (merged.firstName || merged.lastName)) {
    merged.displayName = `${merged.firstName} ${merged.lastName}`.trim();
  }

  return merged;
}

export function profileFromOnboarding(
  onboarding: OnboardingSubmission | null | undefined,
): Partial<UserProfile> {
  if (!onboarding) {
    return {};
  }

  return {
    firstName: onboarding.firstName?.trim() || "",
    lastName: onboarding.lastName?.trim() || "",
    studentYear: onboarding.yearClassification?.trim() || "",
    school: onboarding.school?.trim() || "",
    major: onboarding.major?.trim() || "",
    interests: dedupeStringArray(onboarding.interests),
    goals: dedupeStringArray(onboarding.goals),
    hobbies: dedupeStringArray(onboarding.hobbies),
  };
}

export function profileFromAuthUser(
  user: Pick<User, "uid" | "email" | "displayName"> | null,
): Partial<UserProfile> {
  if (!user) {
    return {};
  }

  const profile: Partial<UserProfile> = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
  };

  if (user.displayName) {
    const [firstName, ...lastNameParts] = user.displayName.split(" ");
    profile.firstName = firstName || "";
    profile.lastName = lastNameParts.join(" ").trim();
  }

  return profile;
}

function readJsonFromLocalStorage<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function readOnboardingSubmissionFromLocalStorage():
  | OnboardingSubmission
  | null {
  const parsed = readJsonFromLocalStorage<unknown>(
    ONBOARDING_SUBMISSION_STORAGE_KEY,
  );

  if (!isRecord(parsed)) {
    return null;
  }

  return {
    firstName: toTrimmedString(parsed.firstName),
    lastName: toTrimmedString(parsed.lastName),
    yearClassification: toTrimmedString(parsed.yearClassification),
    school: toTrimmedString(parsed.school),
    major: toTrimmedString(parsed.major),
    interests: dedupeStringArray(parsed.interests),
    goals: dedupeStringArray(parsed.goals),
    hobbies: dedupeStringArray(parsed.hobbies),
    communityPreference: toTrimmedString(parsed.communityPreference),
    topGoal: toTrimmedString(parsed.topGoal),
    weeklyAvailability: toTrimmedString(parsed.weeklyAvailability),
    submittedAt: toTrimmedString(parsed.submittedAt),
  };
}

export function readProfileFromLocalStorage(): UserProfile | null {
  const parsed = readJsonFromLocalStorage<unknown>(PROFILE_STORAGE_KEY);
  if (!isRecord(parsed)) {
    return null;
  }

  return mergeUserProfiles({
    uid: toTrimmedString(parsed.uid),
    displayName: toTrimmedString(parsed.displayName),
    email: toTrimmedString(parsed.email),
    firstName: toTrimmedString(parsed.firstName),
    lastName: toTrimmedString(parsed.lastName),
    studentYear: toTrimmedString(parsed.studentYear),
    school: toTrimmedString(parsed.school),
    major: toTrimmedString(parsed.major),
    interests: dedupeStringArray(parsed.interests),
    goals: dedupeStringArray(parsed.goals),
    hobbies: dedupeStringArray(parsed.hobbies),
    organizations: dedupeStringArray(parsed.organizations),
    updatedAt: toTrimmedString(parsed.updatedAt),
  });
}

export function writeProfileToLocalStorage(profile: UserProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
