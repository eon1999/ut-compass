// Weighted sum scoring for ranking events by user relevance.
// Interests, goals, and hobbies now store EVENT_CATEGORIES keys directly,
// so buildUserPreferences simply accumulates them with no translation layer.
// Only major still requires a lookup since major names don't match event category keys.

type CategoryWeights = Partial<Record<string, number>>;

// Maps major strings (as stored from onboarding dropdowns) → event categories.
// Best-effort for the most common majors; unlisted majors contribute nothing.
export const MAJOR_TO_CATEGORIES: Record<string, CategoryWeights> = {
  // Cockrell School of Engineering
  "Aerospace Engineering":               { technologyAndEngineering: 0.9, academicAndResearch: 0.5 },
  "Biomedical Engineering":              { technologyAndEngineering: 0.8, healthAndWellness: 0.7, academicAndResearch: 0.5 },
  "Chemical Engineering":                { technologyAndEngineering: 0.8, academicAndResearch: 0.6 },
  "Civil Engineering":                   { technologyAndEngineering: 0.8, academicAndResearch: 0.5 },
  "Computational Engineering":           { technologyAndEngineering: 0.9, academicAndResearch: 0.6 },
  "Electrical and Computer Engineering": { technologyAndEngineering: 0.9, academicAndResearch: 0.5 },
  "Mechanical Engineering":              { technologyAndEngineering: 0.9, academicAndResearch: 0.5 },
  // College of Natural Sciences
  "Computer Science":                    { technologyAndEngineering: 0.9, academicAndResearch: 0.5 },
  "Mathematics":                         { academicAndResearch: 0.9, technologyAndEngineering: 0.5 },
  "Biology":                             { academicAndResearch: 0.9, healthAndWellness: 0.5 },
  "Biochemistry":                        { academicAndResearch: 0.9, healthAndWellness: 0.6 },
  "Neuroscience":                        { academicAndResearch: 0.9, healthAndWellness: 0.6 },
  "Physics":                             { academicAndResearch: 0.9, technologyAndEngineering: 0.6 },
  "Chemistry":                           { academicAndResearch: 0.9 },
  "Statistics and Data Science":         { technologyAndEngineering: 0.7, academicAndResearch: 0.8 },
  "Public Health":                       { healthAndWellness: 1.0, academicAndResearch: 0.5 },
  // McCombs School of Business
  "Accounting":                          { careerAndNetworking: 0.8 },
  "Business Analytics":                  { careerAndNetworking: 0.7, technologyAndEngineering: 0.5 },
  "Finance":                             { careerAndNetworking: 0.9 },
  "Management":                          { careerAndNetworking: 0.8, socialAndCommunity: 0.4 },
  "Marketing":                           { careerAndNetworking: 0.7, socialAndCommunity: 0.5 },
  // College of Liberal Arts
  "Government":                          { politicsAndAdvocacy: 0.9, socialAndCommunity: 0.4 },
  "Economics":                           { careerAndNetworking: 0.7, academicAndResearch: 0.6 },
  "Psychology":                          { academicAndResearch: 0.8, healthAndWellness: 0.5, socialAndCommunity: 0.4 },
  "Sociology":                           { socialAndCommunity: 0.8, academicAndResearch: 0.6 },
  "History":                             { academicAndResearch: 0.8, culturalAndInternational: 0.6 },
  "Philosophy":                          { academicAndResearch: 0.8, socialAndCommunity: 0.4 },
  "English":                             { academicAndResearch: 0.7, artsAndPerformance: 0.5 },
  "International Relations and Global Studies": { politicsAndAdvocacy: 0.7, culturalAndInternational: 0.9 },
  // College of Fine Arts
  "Music":                               { music: 1.0, artsAndPerformance: 0.7 },
  "Music Performance":                   { music: 1.0, artsAndPerformance: 0.8 },
  "Design":                              { artsAndPerformance: 0.8, technologyAndEngineering: 0.4 },
  "Studio Art":                          { artsAndPerformance: 1.0 },
  "Acting":                              { artsAndPerformance: 1.0 },
  // Moody College of Communication
  "Journalism":                          { socialAndCommunity: 0.6, politicsAndAdvocacy: 0.5, careerAndNetworking: 0.5 },
  "Advertising":                         { careerAndNetworking: 0.7, socialAndCommunity: 0.5 },
  "Public Relations":                    { careerAndNetworking: 0.7, socialAndCommunity: 0.6 },
  "Radio-Television-Film":               { artsAndPerformance: 0.8, careerAndNetworking: 0.4 },
  // School of Information
  "Informatics":                         { technologyAndEngineering: 0.8, academicAndResearch: 0.5 },
  // College of Education
  "Education":                           { academicAndResearch: 0.7, socialAndCommunity: 0.6 },
  // Jackson School of Geosciences
  "Environmental Science":               { academicAndResearch: 0.8, volunteerAndService: 0.5 },
};

// --- Preference vector builder ---

export interface UserOnboardingData {
  interests?: string[];
  goals?: string[];
  hobbies?: string[];
  major?: string;
}

/**
 * Converts user onboarding data into a preference vector over event category keys.
 * Interests, goals, and hobbies are stored as EVENT_CATEGORIES keys directly, so
 * each selection contributes 1.0 to its key (no translation needed).
 * Major is still a human-readable string and goes through MAJOR_TO_CATEGORIES.
 * The vector is NOT normalized — raw sums are used so that more selections = stronger signal.
 */
export function buildUserPreferences(
  user: UserOnboardingData,
): Record<string, number> {
  const prefs: Record<string, number> = {};

  for (const key of [
    ...(user.interests ?? []),
    ...(user.goals ?? []),
    ...(user.hobbies ?? []),
  ]) {
    prefs[key] = (prefs[key] ?? 0) + 1.0;
  }

  if (user.major) {
    const majorContributions = MAJOR_TO_CATEGORIES[user.major];
    if (majorContributions) {
      for (const [cat, w] of Object.entries(majorContributions)) {
        prefs[cat] = (prefs[cat] ?? 0) + (w ?? 0);
      }
    }
  }

  return prefs;
}

// --- Scoring function ---

interface ScoredEvent {
  weights?: {
    categories?: Record<string, number>;
  };
}

/**
 * Computes a relevance score for a single event given a user preference vector.
 * Score = dot product of userPrefs and event.weights.categories.
 * Returns 0 if the event has no weights (un-enriched events sink to the bottom).
 */
export function scoreEvent(
  event: ScoredEvent,
  userPrefs: Record<string, number>,
): number {
  const categoryScores = event.weights?.categories;
  if (!categoryScores) return 0;

  let score = 0;
  for (const [category, eventWeight] of Object.entries(categoryScores)) {
    score += (userPrefs[category] ?? 0) * eventWeight;
  }
  return score;
}
