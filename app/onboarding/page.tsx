"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";


type OnboardingFormData = {
  firstName: string;
  lastName: string;
  yearClassification: string;
  school: string;
  major: string;
  interests: string[];
  goals: string[];
  hobbies: string[];
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
        formData.hobbies.length > 0,
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

  // list of majors that corresponds to the chosen school
  const availableMajors: string[] = useMemo(() => {
    if (!formData.school) return [];
    // index cast to avoid implicit any
    return (schoolOptions as Record<string, string[]>)[formData.school] || [];
  }, [formData.school]);

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

  const handleSubmit = async () => {
    if (currentStep !== steps.length - 1 || !canContinue) {
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setSubmitted(false);
      return;
    }

    const payload = {
      ...formData,
      submittedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", uid), payload);

    window.localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setSubmitted(true);
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
      <section className="hidden bg-blue-900 p-10 lg:flex lg:flex-col">
        <div className="inline-flex items-center gap-2 text-2xl font-more-sugar font-semibold text-[#f4f4f6]">
          <Compass className="h-7 w-7" />
          UT Compass
        </div>
      </section>

      <section className="p-6 md:p-10">
        <div className="mx-auto max-w-[520px]">
          <button
            type="button"
            onClick={handleBack}
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

          <form className="mt-10 space-y-8">
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
                <p className="text-sm font-medium text-gray-500 mb2">Add current organizations functionality</p>
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
                    <dt className="font-medium text-gray-500">Interests</dt>
                    <dd>{formData.interests.join(", ")}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Interests</dt>
                    <dd>{formData.hobbies.join(", ")}</dd>
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
                  disabled={!canContinue}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
                >
                  Finish onboarding
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