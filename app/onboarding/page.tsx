"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseConfig";


type OnboardingFormData = {
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


type Step = {
  id: string;
  label: string;
  title: string;
  description: string;
};

const DRAFT_STORAGE_KEY = "ut-compass-onboarding-draft";
const SUBMISSION_STORAGE_KEY = "ut-compass-onboarding-submission";

const steps: Step[] = [
  {
    id: "profile",
    label: "Profile",
    title: "Welcome to UT Compass!",
    description: "Tell us the basics so we can personalize your experience.",
  },
  {
    id: "academics",
    label: "Academics",
    title: "Academic Interests",
    description: "Tell us your academic interests.",
  },
  {
    id: "career",
    label: "career",
    title: "Career Goals",
    description: "Let us know your pre-professional aspirations.",
  },
  {
    id: "hobbies",
    label: "hobbies",
    title: "Your Hobbies",
    description: "Let us know your extracurricular hobbies.",
  },
  {
    id: "review",
    label: "Review",
    title: "Review & Submit",
    description: "Quickly verify your responses before finishing onboarding.",
  },
];

const initialFormData: OnboardingFormData = {
  firstName: "",
  lastName: "",
  yearClassification: "",
  school: "", 
  major: "",
  interests: [],
  goals: [],
  hobbies: [],
  communityPreference: "",
  topGoal: "",
  weeklyAvailability: "",
};


const yearClassificationOptions = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
];

const schoolOptions: Record<string, string[]> = {
    "School of Architecture": ["Architectural Studies", 
        "Architecture", 
        "Architecture/Architectural Engineering", 
        "Interior Design"],
    "McCombs School of Business": ["Accounting",
        "Business Analytics", 
        "Canfield Business Honors Program",
        "Finance",
        "International Business",
        "Management",
        "Management Information Systems",
        "Marketing",
        "Supply Chain Management"],
    "School of Civic Leadership": ["Civics Honors",
        "Great Books Honors",
        "Strategy and Statecraft"],
    "Moody College of Communication": ["Advertising",
        "Communication and Leadership",
        "Communication Studies",
        "Journalism",
        "Public Relations",
        "Radio-Television-Film",
        "Speech, Language, and Hearing Sciences",
        "Undeclared (Communication)"],
    "College of Education": ["Education",
        "Kinesiology and Health",
        "Athletic Training"],
    "Cockrell School of Engineering": ["Aerospace Engineering",
        "Architectural Engineering",
        "Biomedical Engineering",
        "Chemical Engineering",
        "Civil Engineering",
        "Computational Engineering",
        "Electrical and Computer Engineering",
        "Environmental Engineering",
        "Geosystems Engineering",
        "Mechanical Engineering",
        "Petroleum Engineering"],
    "College of Fine Arts": ["Acting",
        "Art Education",
        "Art History",
        "Arts and Entertainment Technologies",
        "Dance",
        "Dance Education",
        "Design",
        "Jazz",
        "Music",
        "Music Composition",
        "Music Performance",
        "Music Studies",
        "Studio Art",
        "Theatre & Dance, Dance",
        "Theatre & Dance, Theatre",
        "Theatre Education"],
    "Jackson School of Geosciences": ["Climate System Science",
        "Environmental Science",
        "General Geology",
        "Geophysics",
        "Geosciences",
        "Geosciences (Teaching)",
        "Geosystems Engineering",
        "Hydrology and Water Resources"],
    "School of Information": ["Informatics"],
    "College of Liberal Arts": ["African and African Diaspora Studies",
        "American Studies",
        "Anthropology",
        "Asian American Studies",
        "Asian Cultures and Languages",
        "Asian Studies",
        "Behavioral and Social Data Science",
        "Classical Languages",
        "Classical Studies",
        "Economics",
        "English",
        "Environmental Science",
        "European Studies",
        "French Studies",
        "Geography",
        "German",
        "Government",
        "Health & Society",
        "History",
        "Human Dimensions of Organizations",
        "Humanities",
        "International Relations and Global Studies",
        "Italian",
        "Jewish Studies",
        "Latin American Studies",
        "Linguistics",
        "Mexican American and Latina/o Studies",
        "Middle Eastern Studies",
        "Philosophy",
        "Plan II Honors Program",
        "Psychology",
        "Race, Indigeneity, and Migration",
        "Religious Studies",
        "Rhetoric and Writing",
        "Russian, East European and Eurasian Studies",
        "Sociology",
        "Spanish",
        "Sustainability Studies",
        "Undeclared (Liberal Arts)",
        "Urban Studies",
        "Women’s and Gender Studies"],
    "College of Natural Sciences": ["Astronomy",
        "Biochemistry",
        "Biology",
        "Chemistry",
        "Computer Science",
        "Environmental Science",
        "Human Development and Family Sciences",
        "Human Ecology",
        "Mathematics",
        "Medical Laboratory Science",
        "Neuroscience",
        "Nutrition",
        "Physics",
        "Pre-Pharmacy",
        "Public Health",
        "Statistics and Data Science",
        "Textiles and Apparel",
        "Undeclared (Natural Sciences)"]
};


const academicInterestOptions = [
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
  "Product Management"
];

const careerGoalOptions = [
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

const hobbyOptions = [
  "Playing music",
  "Drawing/painting",
  "Reading",
  "Socializing",
  "Crocheting",
  "Cafe-hopping",
  "Hiking",
  "Running",
];

const weeklyAvailabilityOptions = [
  "1-3 hours",
  "4-6 hours",
  "7-10 hours",
  "10+ hours",
];

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const parseOnboardingPayload = (value: unknown): Partial<OnboardingFormData> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Partial<Record<keyof OnboardingFormData, unknown>>;
  return {
    firstName: typeof candidate.firstName === "string" ? candidate.firstName : "",
    lastName: typeof candidate.lastName === "string" ? candidate.lastName : "",
    yearClassification:
      typeof candidate.yearClassification === "string"
        ? candidate.yearClassification
        : "",
    school: typeof candidate.school === "string" ? candidate.school : "",
    major: typeof candidate.major === "string" ? candidate.major : "",
    interests: toStringArray(candidate.interests),
    goals: toStringArray(candidate.goals),
    hobbies: toStringArray(candidate.hobbies),
    communityPreference:
      typeof candidate.communityPreference === "string"
        ? candidate.communityPreference
        : "",
    topGoal: typeof candidate.topGoal === "string" ? candidate.topGoal : "",
    weeklyAvailability:
      typeof candidate.weeklyAvailability === "string"
        ? candidate.weeklyAvailability
        : "",
  };
};

const isStepValid = (stepIndex: number, formData: OnboardingFormData): boolean => {
  switch (stepIndex) {
    case 0:
      return Boolean(
        formData.firstName.trim() &&
          formData.lastName.trim() &&
          formData.yearClassification &&
          formData.school &&
          formData.major,
      );
    case 1:
      return Boolean(
        formData.interests.length > 0,
      );
    case 2:
      return Boolean(
        formData.goals.length > 0,
      );
    case 3:
      return Boolean(
        formData.hobbies.length > 0 && formData.topGoal.trim() && formData.weeklyAvailability,
      );
    case 4:
      return true;
    default:
      return false;
  }
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>(() => {
    if (typeof window === "undefined") {
      return initialFormData;
    }

    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!savedDraft) {
      return initialFormData;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft) as Partial<OnboardingFormData>;
      return {
        ...initialFormData,
        ...parsedDraft,
      };
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return initialFormData;
    }
  });
  const [submitted, setSubmitted] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  // list of majors that corresponds to the chosen school
  const availableMajors: string[] = useMemo(() => {
    if (!formData.school) return [];
    // index cast to avoid implicit any
    return (schoolOptions as Record<string, string[]>)[formData.school] || [];
  }, [formData.school]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);

      if (!user) {
        setIsHydrating(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();
        const cloudOnboarding = parseOnboardingPayload(data.onboarding);
        if (Object.values(cloudOnboarding).some(Boolean)) {
          setFormData((previousData) => ({
            ...previousData,
            ...cloudOnboarding,
          }));
        }
      } catch (error) {
        console.error("Unable to load onboarding from Firestore", error);
        setSyncError("Unable to load your cloud onboarding data.");
      } finally {
        setIsHydrating(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (submitted) {
      return;
    }

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
  }, [formData, submitted]);

  const canContinue = useMemo(
    () => isStepValid(currentStep, formData),
    [currentStep, formData],
  );

  const updateField = <K extends keyof OnboardingFormData>(
    key: K,
    value: OnboardingFormData[K],
  ) => {
    setFormData((previousData) => ({
      ...previousData,
      [key]: value,
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData((previousData) => {
      const hasInterest = previousData.interests.includes(interest);
      return {
        ...previousData,
        interests: hasInterest
          ? previousData.interests.filter((item) => item !== interest)
          : [...previousData.interests, interest],
      };
    });
  };
  
  const toggleGoal = (goal: string) => {
    setFormData((previousData) => {
      const hasGoal = previousData.goals.includes(goal);
      return {
        ...previousData,
        goals: hasGoal
          ? previousData.goals.filter((item) => item !== goal)
          : [...previousData.goals, goal],
      };
    });
  };

  const toggleHobby = (hobby: string) => {
    setFormData((previousData) => {
      const hasHobby = previousData.hobbies.includes(hobby);
      return {
        ...previousData,
        hobbies: hasHobby
          ? previousData.hobbies.filter((item) => item !== hobby)
          : [...previousData.hobbies, hobby],
      };
    });
  };

  const handleBack = () => {
    if (submitted) {
      router.push("/");
      return;
    }

    if (currentStep === 0) {
      router.push("/");
      return;
    }

    setCurrentStep((previousStep) => previousStep - 1);
  };

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    setCurrentStep((previousStep) => previousStep + 1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue) {
      return;
    }

    setIsSaving(true);
    setSyncError("");
    setSyncMessage("");

    const payload = {
      ...formData,
      submittedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);

      if (authUser) {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        await setDoc(
          doc(db, "users", authUser.uid),
          {
            uid: authUser.uid,
            name: fullName || authUser.displayName || "",
            email: authUser.email || "",
            onboarding: {
              ...formData,
              submittedAt: serverTimestamp(),
            },
            profile: {
              name: fullName || authUser.displayName || "",
              email: authUser.email || "",
              studentYear: formData.yearClassification,
              school: formData.school,
              major: formData.major,
              preferences: {
                academicInterests: formData.interests,
                preProfessionalAspirations: formData.goals,
                hobbies: formData.hobbies,
                organizations: [],
                schoolYearGoal: formData.topGoal,
              },
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        setSyncMessage("Onboarding synced to Firestore.");
      } else {
        setSyncMessage("Saved locally. Sign in to sync this onboarding.");
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Unable to save onboarding", error);
      setSyncError("Unable to save onboarding to Firestore right now.");
    } finally {
      setIsSaving(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#f4f4f6] p-6 md:p-10">
        <div className="mx-auto flex max-w-3xl flex-col rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-gray-900">
            You&apos;re all set!
          </h1>
          <p className="mt-3 text-gray-600">
            Your onboarding responses were saved successfully. You can continue
            to your profile or restart onboarding if you want to edit your
            answers.
          </p>
          {syncMessage && (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {syncMessage}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Go to profile
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(SUBMISSION_STORAGE_KEY);
                window.localStorage.removeItem(DRAFT_STORAGE_KEY);
                setFormData(initialFormData);
                setCurrentStep(0);
                setSubmitted(false);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Start over
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
   <main className="min-h-screen bg-[#f4f4f6] lg:grid lg:grid-cols-2">
      <section className="hidden bg-[#d9d9db] p-10 lg:flex lg:flex-col">
        <div className="inline-flex items-center gap-3 text-xl font-semibold text-[#23395d]">
          <span className="h-8 w-8 rounded-full bg-white/75" />
          UT Compass
        </div>
      </section>

      <section className="p-6 md:p-10">
        <div className="mx-auto max-w-[520px]">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSaving}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <ol className="mt-8 flex items-center">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <li
                  key={step.id}
                  className="flex flex-1 items-center last:flex-none"
                >
                  <span
                    title={step.label}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                      isCompleted
                        ? "border-blue-700 bg-blue-700 text-white"
                        : isCurrent
                          ? "border-blue-700 text-blue-700"
                          : "border-gray-300 text-gray-400"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  {index < steps.length - 1 && (
                    <span
                      className={`mx-2 h-[2px] flex-1 ${
                        isCompleted ? "bg-blue-700" : "bg-gray-300"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <h1 className="mt-10 text-4xl font-semibold text-gray-900">
            {steps[currentStep].title}
          </h1>
          <p className="mt-3 text-gray-600">{steps[currentStep].description}</p>
          {isHydrating && (
            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading your saved onboarding from Firestore...
            </p>
          )}
          {!isHydrating && !authUser && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You are not signed in. Your progress will only be saved locally.
            </p>
          )}
          {syncError && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {syncError}
            </p>
          )}

          <form className="mt-10 space-y-8" onSubmit={handleSubmit}>
            {currentStep === 0 && (
              <div className="space-y-6">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-gray-700">
                    Enter your name
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(event) =>
                        updateField("firstName", event.target.value)
                      }
                      placeholder="First name"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                    />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(event) =>
                        updateField("lastName", event.target.value)
                      }
                      placeholder="Last name"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                    />
                  </div>
                </fieldset>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Enter your student year
                  </span>
                  <select
                    value={formData.yearClassification}
                    onChange={(event) =>
                      updateField("yearClassification", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">Year classification</option>
                    {yearClassificationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Select your school
                  </span>
                  <select
                    value={formData.school}
                    onChange={(event) => {
                      updateField("school", event.target.value);
                      updateField("major", "");
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">School</option>
                    {Object.keys(schoolOptions).map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Enter your major
                  </span>
                  <select
                    value={formData.major}
                    onChange={(event) => updateField("major", event.target.value)}
                    disabled={!formData.school}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700 disabled:bg-gray-100"
                  >
                    <option value="">Major</option>
                    {availableMajors.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                    {academicInterestOptions.map((option) => {
                      const checked = formData.interests.includes(option);
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            checked
                              ? "border-blue-700 bg-blue-50"
                              : "border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInterest(option)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-700"
                          />
                          <span className="text-sm text-gray-800">{option}</span>
                        </label>
                      );
                    })}
                  </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                  <div className="space-y-2">
                    {careerGoalOptions.map((option) => {
                      const checked = formData.goals.includes(option);
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            checked
                              ? "border-blue-700 bg-blue-50"
                              : "border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGoal(option)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-700"
                          />
                          <span className="text-sm text-gray-800">{option}</span>
                        </label>
                      );
                    })}
                  </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <p className="text-sm font-medium text-gray-700">Select your hobbies</p>
                <div className="space-y-2">
                  {hobbyOptions.map((option) => {
                    const checked = formData.hobbies.includes(option);
                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                          checked
                            ? "border-blue-700 bg-blue-50"
                            : "border-gray-300 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleHobby(option)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-700"
                        />
                        <span className="text-sm text-gray-800">{option}</span>
                      </label>
                    );
                  })}
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Top goal this school year
                  </span>
                  <textarea
                    value={formData.topGoal}
                    onChange={(event) => updateField("topGoal", event.target.value)}
                    placeholder="Example: Join 2 orgs and keep a 3.5 GPA."
                    className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Weekly time available for campus involvement
                  </span>
                  <select
                    value={formData.weeklyAvailability}
                    onChange={(event) =>
                      updateField("weeklyAvailability", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">Select weekly availability</option>
                    {weeklyAvailabilityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  Review your responses
                </h2>
                <dl className="space-y-3 text-sm text-gray-700">
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Name</dt>
                    <dd>{`${formData.firstName} ${formData.lastName}`}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Year</dt>
                    <dd>{formData.yearClassification}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">School</dt>
                    <dd>{formData.school}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Major</dt>
                    <dd>{formData.major}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Academic Interests</dt>
                    <dd>{formData.interests.join(", ")}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Career Goals</dt>
                    <dd>{formData.goals.join(", ")}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Hobbies</dt>
                    <dd>{formData.hobbies.join(", ")}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Top goal</dt>
                    <dd>{formData.topGoal}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="font-medium text-gray-500">Weekly time</dt>
                    <dd>{formData.weeklyAvailability}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </span>

              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue || isHydrating || isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isHydrating || isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSaving ? "Saving..." : "Finish onboarding"}
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}