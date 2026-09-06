/**
 * Central plan / feature configuration for Lyric.
 *
 * Every plan check in the app (client and server) reads from here. To change
 * an allowance you edit the default below, or set the matching environment
 * variable — nothing else in the app needs to be touched.
 *
 *   FREE_MESSAGE_LIMIT / PLUS_MESSAGE_LIMIT / PRO_MESSAGE_LIMIT
 *   FREE_SEARCH_LIMIT  / PLUS_SEARCH_LIMIT  / PRO_SEARCH_LIMIT
 *   FREE_CONTEXT_LIMIT / PLUS_CONTEXT_LIMIT / PRO_CONTEXT_LIMIT
 *
 * Client builds can override the same numbers with a VITE_ prefix
 * (e.g. VITE_FREE_MESSAGE_LIMIT) so the UI shows the same figures the
 * server enforces.
 */

export type PlanId = "free" | "plus" | "pro";

export type FeatureKey =
  | "chat"
  | "history"
  | "editMessages"
  | "webSearch"
  | "quizzes"
  | "studyTools"
  | "advancedModels"
  | "priority";

export interface PlanLimits {
  /** AI messages allowed per UTC day. */
  messagesPerDay: number;
  /** Live web searches allowed per UTC day. */
  searchesPerDay: number;
  /** How many past turns are sent with each question. */
  contextMessages: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceLabel: string;
  cadence: string;
  blurb: string;
  highlighted?: boolean;
  limits: PlanLimits;
  features: Record<FeatureKey, boolean>;
  /** Human-readable bullets for the plans UI. */
  highlights: string[];
}

const DEFAULT_LIMITS: Record<PlanId, PlanLimits> = {
  free: { messagesPerDay: 30, searchesPerDay: 5, contextMessages: 12 },
  plus: { messagesPerDay: 300, searchesPerDay: 60, contextMessages: 30 },
  pro: { messagesPerDay: 1500, searchesPerDay: 300, contextMessages: 60 },
};

/** Reads an override from either the server or the client environment. */
function envNumber(name: string, fallback: number): number {
  let raw: unknown;
  try {
    const viteEnv = import.meta.env as Record<string, string | undefined>;
    raw = viteEnv?.[`VITE_${name}`];
  } catch {
    /* import.meta.env unavailable */
  }
  if (raw === undefined && typeof process !== "undefined" && process.env) {
    raw = process.env[name] ?? process.env[`VITE_${name}`];
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function limitsFor(plan: PlanId): PlanLimits {
  const key = plan.toUpperCase();
  const base = DEFAULT_LIMITS[plan];
  return {
    messagesPerDay: envNumber(`${key}_MESSAGE_LIMIT`, base.messagesPerDay),
    searchesPerDay: envNumber(`${key}_SEARCH_LIMIT`, base.searchesPerDay),
    contextMessages: envNumber(`${key}_CONTEXT_LIMIT`, base.contextMessages),
  };
}

const FEATURES: Record<PlanId, Record<FeatureKey, boolean>> = {
  free: {
    chat: true,
    history: true,
    editMessages: true,
    webSearch: true,
    quizzes: true,
    studyTools: false,
    advancedModels: false,
    priority: false,
  },
  plus: {
    chat: true,
    history: true,
    editMessages: true,
    webSearch: true,
    quizzes: true,
    studyTools: true,
    advancedModels: false,
    priority: false,
  },
  pro: {
    chat: true,
    history: true,
    editMessages: true,
    webSearch: true,
    quizzes: true,
    studyTools: true,
    advancedModels: true,
    priority: true,
  },
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  chat: "General AI chat",
  history: "Saved chat history",
  editMessages: "Edit and resend messages",
  webSearch: "Live web search",
  quizzes: "Quizzes and tutoring",
  studyTools: "Study plans and flashcards",
  advancedModels: "Advanced AI models",
  priority: "Priority generation",
};

/** The plan catalog, with environment overrides already applied. */
export function getPlanCatalog(): PlanDefinition[] {
  return [
    {
      id: "free",
      name: "Free",
      priceMonthly: 0,
      priceLabel: "$0",
      cadence: "per month",
      blurb: "Genuinely useful on its own",
      limits: limitsFor("free"),
      features: FEATURES.free,
      highlights: [
        "General AI chat for anything",
        "Saved chat history across devices",
        "Edit and resend your messages",
        "Live web search for current questions",
        "Tutoring and quiz offers on study chats",
      ],
    },
    {
      id: "plus",
      name: "Lyric Plus",
      priceMonthly: 8,
      priceLabel: "$8",
      cadence: "per month",
      blurb: "For everyday and serious study",
      highlighted: true,
      limits: limitsFor("plus"),
      features: FEATURES.plus,
      highlights: [
        "Everything in Free",
        "Much higher daily message allowance",
        "Far more live web searches",
        "Longer conversation memory",
        "Study plans and flashcards",
      ],
    },
    {
      id: "pro",
      name: "Lyric Pro",
      priceMonthly: 20,
      priceLabel: "$20",
      cadence: "per month",
      blurb: "Highest limits and newest models",
      limits: limitsFor("pro"),
      features: FEATURES.pro,
      highlights: [
        "Everything in Plus",
        "Highest daily message allowance",
        "Highest web search allowance",
        "Longest conversation memory",
        "Advanced AI models when available",
        "Priority generation",
      ],
    },
  ];
}

export const PLAN_CATALOG = getPlanCatalog();

export function getPlan(plan: PlanId | string | null | undefined): PlanDefinition {
  return PLAN_CATALOG.find((p) => p.id === plan) ?? PLAN_CATALOG[0]!;
}

export function getLimits(plan: PlanId | string | null | undefined): PlanLimits {
  return getPlan(plan).limits;
}

export function hasFeature(plan: PlanId | string | null | undefined, feature: FeatureKey) {
  return getPlan(plan).features[feature];
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Subscription {
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string | null;
}

export interface UsageSnapshot {
  messagesUsed: number;
  searchesUsed: number;
  messagesLimit: number;
  searchesLimit: number;
  /** UTC date the counters belong to. */
  date: string;
}

export const emptyUsage = (plan: PlanId): UsageSnapshot => ({
  messagesUsed: 0,
  searchesUsed: 0,
  messagesLimit: getLimits(plan).messagesPerDay,
  searchesLimit: getLimits(plan).searchesPerDay,
  date: new Date().toISOString().slice(0, 10),
});
