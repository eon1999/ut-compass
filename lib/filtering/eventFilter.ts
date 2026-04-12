// Unified event filter and sort utility.
// Handles source filtering and relevance-based sorting in a single pass.

export type SortBy = "none" | "categoryMatch" | "majorMatch";
export type SourceFilter = "all" | "hornslink" | "instagram" | "manual";

export interface FilterOptions {
  sortBy: SortBy;
  sourceFilter: SourceFilter;
}

// Minimal shape required by this module — a subset of the full EventCard.
export interface FilterableEvent {
  source?: string;
  weights?: {
    categories?: Record<string, number>;
  };
}

/**
 * Computes a relevance score for an event given a user preference vector.
 * Score = dot product of userPrefs and event.weights.categories.
 * Returns 0 for un-enriched events so they sort to the bottom.
 */
function dotProduct(
  prefs: Record<string, number>,
  categories: Record<string, number> | undefined,
): number {
  if (!categories) return 0;
  let score = 0;
  for (const [cat, weight] of Object.entries(categories)) {
    score += (prefs[cat] ?? 0) * weight;
  }
  return score;
}

/**
 * Filters and sorts an array of events according to the given options.
 *
 * @param cards         Full array of event cards (must satisfy FilterableEvent).
 * @param options       Which source to show and how to sort.
 * @param userPrefs     Preference vector built from all user signals
 *                      (interests + goals + hobbies + major).
 * @param majorPrefs    Preference vector built from the user's major only.
 * @returns             New array — filtered then sorted. Original array is not mutated.
 */
export function applyEventFilters<T extends FilterableEvent>(
  cards: T[],
  options: FilterOptions,
  userPrefs: Record<string, number>,
  majorPrefs: Record<string, number>,
): T[] {
  const { sortBy, sourceFilter } = options;

  const filtered =
    sourceFilter === "all"
      ? cards
      : cards.filter((c) => c.source === sourceFilter);

  if (sortBy === "none") return filtered;

  const prefs = sortBy === "categoryMatch" ? userPrefs : majorPrefs;

  return [...filtered].sort(
    (a, b) =>
      dotProduct(prefs, b.weights?.categories) -
      dotProduct(prefs, a.weights?.categories),
  );
}
