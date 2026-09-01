/**
 * Client-side heuristic that decides whether a user question likely needs
 * live web search. Anything whose answer can change over time triggers a
 * search; evergreen educational, creative or how-to questions do not.
 *
 * Deliberately biased towards searching: a false positive still gets a good
 * answer, a false negative returns stale model knowledge.
 */

/** Time words and current-information phrasing. */
const TIME_SENSITIVE_PATTERNS: RegExp[] = [
  /\b(today|tonight|yesterday|tomorrow)\b/,
  /\b(right now|as of now|at the moment|currently|current|present day)\b/,
  /\bthis (week|month|year|morning|weekend|season)\b/,
  /\blast (week|month|night|year|game|match|season)\b/,
  /\b(latest|newest|most recent|up to date|up-to-date|recent|recently)\b/,
  /\b(now|nowadays|these days)\b/,
  /\b(just (happened|announced|released|launched))\b/,
  /\b(breaking|in the news|news about|news on|headlines)\b/,
  /\b(20\d{2})\b/,
  /\b(this january|february|march|april|may|june|july|august|september|october|november|december)\b/,
];

/** Topics whose factual answer changes over time. */
const VOLATILE_TOPIC_PATTERNS: RegExp[] = [
  // Rankings & superlatives
  /\b(richest|wealthiest|top \d+|best[- ]selling|most popular|largest|biggest|leaderboard|rankings?|standings?)\b/,
  /\bnet worth\b/,
  // Markets & prices
  /\b(price|cost|worth|value) of\b/,
  /\b(stock|share) price\b/,
  /\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency|exchange rate|inflation rate|interest rate|market cap|ipo|earnings)\b/,
  // Politics & office holders
  /\b(president|prime minister|ceo|chancellor|governor|mayor|pope|monarch|king|queen)\b/,
  /\b(election|poll|vote count|cabinet|sworn in|inaugurat)/,
  // Sports
  /\b(who won|final score|scoreline|fixtures?|world cup|olympics|playoffs?|championship|transfer window)\b/,
  // Companies / products
  /\b(released|launch(ed|ing)?|available|in stock|discontinued|acquisition|merger|layoffs?|funding round|valuation)\b/,
  // Weather & travel
  /\bweather (in|for|today|tomorrow)\b/,
  /\b(forecast|flight status)\b/,
  // Statistics & discoveries
  /\b(population of|gdp of|unemployment rate|covid|case numbers|statistics for)\b/,
  /\b(new (study|discovery|research|breakthrough))\b/,
];

/** Question shapes that usually ask for a present-day fact. */
const CURRENT_FACT_QUESTION_PATTERNS: RegExp[] = [
  /\bwhat is the current\b/,
  /\bwho is the (current|new)\b/,
  /^who is\b/,
  /\bwho are the\b/,
  /\bhow much (is|does|are)\b/,
  /\bhow many .* (are there|does .* have)\b/,
  /\bis .* still\b/,
  /\bhas .* (been|released|launched|won)\b/,
  /\bwhat happened\b/,
];

/** Clearly evergreen asks — never worth a search on their own. */
const EVERGREEN_PATTERNS: RegExp[] = [
  /\b(explain|define|what does .* mean|how do i|how to|write|draft|summar(y|ise|ize)|translate|rewrite|proofread|brainstorm|solve|prove|derive|simplify|factor)\b/,
];

export function shouldSearchWeb(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (lower.length === 0) return false;

  const volatile =
    TIME_SENSITIVE_PATTERNS.some((p) => p.test(lower)) ||
    VOLATILE_TOPIC_PATTERNS.some((p) => p.test(lower)) ||
    CURRENT_FACT_QUESTION_PATTERNS.some((p) => p.test(lower));

  if (!volatile) return false;

  // An evergreen instruction verb only wins when nothing time-specific is present.
  const timeSpecific =
    TIME_SENSITIVE_PATTERNS.some((p) => p.test(lower)) ||
    VOLATILE_TOPIC_PATTERNS.some((p) => p.test(lower));
  if (!timeSpecific && EVERGREEN_PATTERNS.some((p) => p.test(lower))) return false;

  return true;
}
