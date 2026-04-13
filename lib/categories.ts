export interface CategoryStyle {
  label: string;
  bg: string;
  text: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryStyle> = {
  technologyAndEngineering: { label: "Tech & Engineering", bg: "bg-indigo-50",  text: "text-indigo-700"  },
  academicAndResearch:      { label: "Academic",           bg: "bg-blue-50",    text: "text-blue-700"   },
  careerAndNetworking:      { label: "Career",             bg: "bg-amber-50",   text: "text-amber-700"  },
  healthAndWellness:        { label: "Health & Wellness",  bg: "bg-green-50",   text: "text-green-700"  },
  socialAndCommunity:       { label: "Social",             bg: "bg-pink-50",    text: "text-pink-700"   },
  artsAndPerformance:       { label: "Arts",               bg: "bg-purple-50",  text: "text-purple-700" },
  music:                    { label: "Music",              bg: "bg-teal-50",    text: "text-teal-700"   },
  politicsAndAdvocacy:      { label: "Politics",           bg: "bg-red-50",     text: "text-red-700"    },
  culturalAndInternational: { label: "Cultural",           bg: "bg-yellow-50",  text: "text-yellow-700" },
  volunteerAndService:      { label: "Volunteer",          bg: "bg-emerald-50", text: "text-emerald-700"},
  sportsAndRecreation:      { label: "Sports & Rec",       bg: "bg-sky-50",     text: "text-sky-700"    },
  foodAndDrinks:            { label: "Food & Drinks",      bg: "bg-orange-50",  text: "text-orange-700" },
  faithAndSpirituality:     { label: "Faith",              bg: "bg-rose-50",    text: "text-rose-700"   },
  gamingAndEsports:         { label: "Gaming & Esports",   bg: "bg-violet-50",  text: "text-violet-700" },
};

export const DEFAULT_CATEGORY: CategoryStyle = { label: "Other", bg: "bg-gray-100", text: "text-gray-600" };

export function getCategoryStyle(key: string): CategoryStyle {
  return CATEGORY_CONFIG[key] ?? DEFAULT_CATEGORY;
}
