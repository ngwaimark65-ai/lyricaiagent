/**
 * Client-side heuristic that decides whether a user question likely needs
 * live web search. Time-sensitive / current-value questions trigger search;
 * evergreen educational or creative questions do not.
 *
 * This is intentionally conservative — false positives still get answered,
 * false negatives would miss current information.
 */

const TIME_SENSITIVE_PHRASES = [
  "right now",
  "currently",
  "today",
  "yesterday",
  "this week",
  "this month",
  "this year",
  "latest",
  "most recent",
  "just happened",
  "breaking news",
  "in the news",
  "recently",
  "happened",
];

const CURRENT_VALUE_PHRASES = [
  "price of",
  "worth right now",
  "worth currently",
  "value of",
  "stock price",
  "bitcoin price",
  "crypto price",
  "weather in",
  "weather for",
  "who won",
  "who is the richest",
  "richest person",
  "election results",
  "market cap",
];

export function shouldSearchWeb(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (lower.length === 0) return false;
  return (
    TIME_SENSITIVE_PHRASES.some((p) => lower.includes(p)) ||
    CURRENT_VALUE_PHRASES.some((p) => lower.includes(p))
  );
}
