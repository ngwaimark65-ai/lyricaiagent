import type { Plan } from "./types";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Lyric Free",
    price: "$0",
    cadence: "forever",
    blurb: "Perfect for getting started",
    features: [
      "General AI chat",
      "Basic tutoring",
      "Limited quizzes",
      "Limited image questions",
      "Limited daily usage",
    ],
  },
  {
    id: "plus",
    name: "Lyric Plus",
    price: "$12",
    cadence: "per month",
    blurb: "For serious students",
    highlighted: true,
    features: [
      "More AI usage",
      "More quizzes",
      "More image questions",
      "Advanced tutoring",
      "Study plans and flashcards",
      "Voice features when available",
    ],
  },
  {
    id: "pro",
    name: "Lyric Pro",
    price: "$29",
    cadence: "per month",
    blurb: "Highest limits, newest models",
    features: [
      "Highest usage limits",
      "Advanced AI models when available",
      "More image analysis",
      "Advanced education features",
      "Priority generation",
      "Future creative features",
    ],
  },
];

export const PLAN_ALLOWANCE: Record<Plan["id"], number> = {
  free: 60,
  plus: 600,
  pro: 2000,
};
