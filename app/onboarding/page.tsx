"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type OnboardingFormData = {
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
    title: "Academic Preferences",
    description: "Help us match recommendations to your learning style.",
  },
  {
    id: "community",
    label: "Community",
    title: "Campus Involvement",
    description: "Let us know what kinds of communities interest you.",
  },
  {
    id: "goals",
    label: "Goals",
    title: "Your Goals",
    description: "Share what you want to get out of your first semester.",
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
  major: "",
  preferredCreditLoad: "",
  studyStyle: "",
  interests: [],
  communityPreference: "",
  topGoal: "",
  weeklyAvailability: "",
};

const yearClassificationOptions = [
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

const creditLoadOptions = ["12-14 credits", "15-17 credits", "18+ credits"];

const studyStyleOptions = [
  "Independent",
  "Small study groups",
  "Office hours / tutoring",
  "Mix of everything",
];

const interestOptions = [
  "Career development",
  "Research opportunities",
  "Student organizations",
  "Volunteering",
  "Sports & recreation",
  "Arts & culture",
];

const communityPreferences = [
  "I like to explore on my own",
  "I prefer small groups",
  "I enjoy large social events",
];

const weeklyAvailabilityOptions = [
  "1-3 hours",
  "4-6 hours",
  "7-10 hours",
  "10+ hours",
];

const isStepValid = (stepIndex: number, formData: OnboardingFormData): boolean => {
  switch (stepIndex) {
    case 0:
      return Boolean(
        formData.firstName.trim() &&
          formData.lastName.trim() &&
          formData.yearClassification &&
          formData.major,
      );
    case 1:
      return Boolean(formData.preferredCreditLoad && formData.studyStyle);
    case 2:
      return Boolean(
        formData.interests.length > 0 && formData.communityPreference,
      );
    case 3:
      return Boolean(formData.topGoal.trim() && formData.weeklyAvailability);
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue) {
      return;
    }

    const payload = {
      ...formData,
      submittedAt: new Date().toISOString(),
    };

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
      <section className="hidden bg-[#d9d9db] p-10 lg:flex lg:flex-col">
        <div className="inline-flex items-center gap-3 text-xl font-semibold text-[#23395d]">
          <span className="h-8 w-8 rounded-full bg-white/75" />
          UT Compass
        </div>
        <div className="mt-auto text-sm text-[#334155]">
          Personalized onboarding for a stronger first semester.
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
                    Enter your major
                  </span>
                  <select
                    value={formData.major}
                    onChange={(event) => updateField("major", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">Major</option>
                    {majorOptions.map((option) => (
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
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Typical credit load
                  </span>
                  <select
                    value={formData.preferredCreditLoad}
                    onChange={(event) =>
                      updateField("preferredCreditLoad", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">Select credit load</option>
                    {creditLoadOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Best study style
                  </span>
                  <select
                    value={formData.studyStyle}
                    onChange={(event) =>
                      updateField("studyStyle", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">Select study style</option>
                    {studyStyleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-gray-700">
                    What are you most interested in?
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {interestOptions.map((option) => {
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
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-gray-700">
                    Which social setting fits you best?
                  </legend>
                  <div className="space-y-2">
                    {communityPreferences.map((option) => (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="communityPreference"
                          value={option}
                          checked={formData.communityPreference === option}
                          onChange={(event) =>
                            updateField("communityPreference", event.target.value)
                          }
                          className="h-4 w-4 border-gray-300 text-blue-700"
                        />
                        <span className="text-sm text-gray-800">{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Top goal for this semester
                  </span>
                  <textarea
                    value={formData.topGoal}
                    onChange={(event) => updateField("topGoal", event.target.value)}
                    placeholder="Example: Find two student orgs and maintain a 3.5 GPA."
                    className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Time you can dedicate weekly
                  </span>
                  <select
                    value={formData.weeklyAvailability}
                    onChange={(event) =>
                      updateField("weeklyAvailability", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-700"
                  >
                    <option value="">Select time available</option>
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
                    <dt className="font-medium text-gray-500">Major</dt>
                    <dd>{formData.major}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Credit load</dt>
                    <dd>{formData.preferredCreditLoad}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Study style</dt>
                    <dd>{formData.studyStyle}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">Interests</dt>
                    <dd>{formData.interests.join(", ")}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <dt className="font-medium text-gray-500">
                      Community preference
                    </dt>
                    <dd>{formData.communityPreference}</dd>
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
                  disabled={!canContinue}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
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