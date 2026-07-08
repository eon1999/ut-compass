// Unified event filter and sort utility.
// Handles source filtering, category filtering, date range filtering,
// and relevance-based sorting in a single pass.

export type SortBy = "none" | "categoryMatch" | "majorMatch";
export type SourceFilter = "all" | "hornslink" | "instagram" | "manual";
export type DateRange = "all" | "today" | "thisWeek" | "thisWeekend" | "nextWeek";

export interface FilterOptions {
  sortBy: SortBy;
  sourceFilter: SourceFilter;
  /** Empty array = show all categories. */
  categoryFilter: string[];
  dateRange: DateRange;
}

// Minimal shape required by this module — a subset of the full EventCard.
export interface FilterableEvent {
  source?: string;
  startTime?: Date;
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
 * Returns the start-of-day (midnight) Date for a given date.
 */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Builds [rangeStart, rangeEnd) boundaries for the given DateRange option.
 * "nextWeek" means the 7-day window starting next Monday.
 */
function getDateBounds(range: DateRange): { start: Date; end: Date } | null {
  if (range === "all") return null;

  const now = new Date();
  const todayStart = startOfDay(now);

  if (range === "today") {
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    return { start: todayStart, end: todayEnd };
  }

  if (range === "thisWeek") {
    // Sunday = 0; roll back to current Sunday, forward 7 days
    const sunday = new Date(todayStart);
    sunday.setDate(todayStart.getDate() - todayStart.getDay());
    const nextSunday = new Date(sunday.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start: sunday, end: nextSunday };
  }

  if (range === "thisWeekend") {
    // Saturday of current week
    const saturday = new Date(todayStart);
    saturday.setDate(todayStart.getDate() + (6 - todayStart.getDay()));
    const monday = new Date(saturday.getTime() + 2 * 24 * 60 * 60 * 1000);
    return { start: saturday, end: monday };
  }

  if (range === "nextWeek") {
    // Monday of next week through the following Sunday
    const daysUntilMonday = (8 - todayStart.getDay()) % 7 || 7;
    const nextMonday = new Date(todayStart.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
    const followingSunday = new Date(nextMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start: nextMonday, end: followingSunday };
  }

  return null;
}

/**
 * Returns true if the event's primary category matches any of the selected
 * categoryFilter keys. Checks weights.categories for the highest-scoring key.
 */
function matchesCategory(
  event: FilterableEvent,
  categoryFilter: string[],
): boolean {
  if (categoryFilter.length === 0) return true;
  const cats = event.weights?.categories;
  if (!cats) return false;
  return categoryFilter.some((key) => (cats[key] ?? 0) > 0);
}

/**
 * Filters and sorts an array of events according to the given options.
 *
 * @param cards         Full array of event cards (must satisfy FilterableEvent).
 * @param options       Source, category, date range filters plus sort strategy.
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
  const { sortBy, sourceFilter, categoryFilter, dateRange } = options;

  const dateBounds = getDateBounds(dateRange);

  const filtered = cards.filter((c) => {
    if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
    if (!matchesCategory(c, categoryFilter)) return false;
    if (dateBounds && c.startTime) {
      if (c.startTime < dateBounds.start || c.startTime >= dateBounds.end) {
        return false;
      }
    }
    return true;
  });

  if (sortBy === "none") return filtered;

  const prefs = sortBy === "categoryMatch" ? userPrefs : majorPrefs;

  return [...filtered].sort(
    (a, b) =>
      dotProduct(prefs, b.weights?.categories) -
      dotProduct(prefs, a.weights?.categories),
  );
}
