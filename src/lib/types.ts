/**
 * Domain model for Lyric.
 *
 * These types mirror the tables that will back the app once Lovable Cloud
 * (Supabase) is connected:
 *   profiles, conversations, messages, quizzes, quiz_attempts,
 *   learning_preferences, usage_ledger, subscriptions.
 *
 * Nothing here talks to a backend yet — the UI reads from a local client
 * store (src/lib/store.ts) so the data layer can be swapped without
 * touching components.
 */

export type MessageRole = "user" | "assistant" | "system";

export type Subject =
  | "mathematics"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "economics"
  | "accounting"
  | "computer-science"
  | "languages";

export interface Attachment {
  id: string;
  kind: "image" | "file";
  name: string;
  /** Object URL while local; becomes a Supabase Storage path later. */
  url: string;
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  createdAt: string;
  /** Set when the message is a placeholder for an unconnected capability. */
  pending?: "model" | "vision" | "voice";
  /** True while the model reply is still streaming in. */
  streaming?: boolean;
  /** Set when the model call failed; content holds the error message. */
  errored?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Detected client-side today; will be model-labelled later. */
  subject: Subject | null;
  educational: boolean;
  quizOffered: boolean;
  quizDeclined: boolean;
}

export type ExplanationStyle = "concise" | "step-by-step" | "socratic" | "analogies";

export interface LearningPreferences {
  gradeYear: string;
  subjects: Subject[];
  goals: string;
  explanationStyle: ExplanationStyle;
  language: string;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  plan: PlanId;
  preferences: LearningPreferences;
}

export type PlanId = "free" | "plus" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  highlighted?: boolean;
}

/** Different AI operations bill different amounts of usage. */
export type UsageOperation =
  | "chat.message"
  | "tutor.session"
  | "quiz.generate"
  | "vision.solve"
  | "flashcards.generate"
  | "studyplan.generate";

export const USAGE_COST: Record<UsageOperation, number> = {
  "chat.message": 1,
  "tutor.session": 2,
  "quiz.generate": 5,
  "vision.solve": 4,
  "flashcards.generate": 3,
  "studyplan.generate": 6,
};

export interface UsageState {
  used: number;
  allowance: number;
  resetsAt: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuizAttempt {
  quizId: string;
  topic: string;
  score: number;
  total: number;
  weakAreas: string[];
  completedAt: string;
}
