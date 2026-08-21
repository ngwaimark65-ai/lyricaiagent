import { useMemo, useSyncExternalStore } from "react";
import type {
  Attachment,
  Conversation,
  Message,
  Profile,
  UsageOperation,
  UsageState,
} from "./types";
import { USAGE_COST } from "./types";
import { detectSubject, isEducational } from "./education";

/**
 * Client-side store standing in for the Supabase data layer.
 *
 * Every mutation below maps 1:1 to a future table write, so swapping this
 * for Cloud queries later is a change in this file only.
 */

interface LyricState {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  profile: Profile;
  usage: UsageState;
}

const STORAGE_KEY = "lyric.state.v1";

const defaultProfile: Profile = {
  id: "local-user",
  displayName: "",
  email: "",
  plan: "free",
  preferences: {
    gradeYear: "",
    subjects: [],
    goals: "",
    explanationStyle: "step-by-step",
    language: "English",
  },
};

const initialState: LyricState = {
  conversations: [],
  messages: [],
  activeConversationId: null,
  profile: defaultProfile,
  usage: {
    used: 0,
    allowance: 60,
    resetsAt: "Resets daily",
  },
};

let state: LyricState = initialState;
const listeners = new Set<() => void>();
let hydrated = false;

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — in-memory only */
  }
}

function set(next: Partial<LyricState>) {
  state = { ...state, ...next };
  persist();
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = { ...initialState, ...(JSON.parse(raw) as LyricState) };
      listeners.forEach((listener) => listener());
    }
  } catch {
    /* ignore malformed cache */
  }
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLyricStore<T>(selector: (s: LyricState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const actions = {
  createConversation(title = "New conversation"): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: uid(),
      title,
      createdAt: now,
      updatedAt: now,
      subject: null,
      educational: false,
      quizOffered: false,
      quizDeclined: false,
    };
    set({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    });
    return conversation;
  },

  selectConversation(id: string | null) {
    set({ activeConversationId: id });
  },

  deleteConversation(id: string) {
    set({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: state.messages.filter((m) => m.conversationId !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    });
  },

  renameConversation(id: string, title: string) {
    set({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    });
  },

  /**
   * Appends the user's turn and a transparent placeholder for the model
   * reply. No response is invented: the assistant slot is explicitly marked
   * as awaiting a connected model.
   */
  sendMessage(conversationId: string, content: string, attachments: Attachment[] = []) {
    const now = new Date().toISOString();
    const conversation = state.conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const subject = detectSubject(content) ?? conversation.subject;
    const educational = conversation.educational || isEducational(content);
    const isFirst = !state.messages.some((m) => m.conversationId === conversationId);

    const userMessage: Message = {
      id: uid(),
      conversationId,
      role: "user",
      content,
      attachments,
      createdAt: now,
    };

    const placeholder: Message = {
      id: uid(),
      conversationId,
      role: "assistant",
      content: attachments.some((a) => a.kind === "image")
        ? "Image received. Lyric's vision model isn't connected yet, so this attachment hasn't been analysed."
        : "Lyric isn't connected to an AI model yet, so there's no reply to show. Your message is saved and will be sent once the model is wired up.",
      createdAt: now,
      pending: attachments.some((a) => a.kind === "image") ? "vision" : "model",
    };

    set({
      messages: [...state.messages, userMessage, placeholder],
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              subject,
              educational,
              updatedAt: now,
              title: isFirst ? content.slice(0, 48) : c.title,
            }
          : c,
      ),
    });

    actions.consumeUsage(attachments.some((a) => a.kind === "image") ? "vision.solve" : "chat.message");
  },

  markQuizOffered(conversationId: string) {
    set({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, quizOffered: true } : c,
      ),
    });
  },

  declineQuiz(conversationId: string) {
    set({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, quizOffered: true, quizDeclined: true } : c,
      ),
    });
  },

  consumeUsage(operation: UsageOperation) {
    const cost = USAGE_COST[operation];
    set({
      usage: {
        ...state.usage,
        used: Math.min(state.usage.allowance, state.usage.used + cost),
      },
    });
  },

  updateProfile(patch: Partial<Profile>) {
    set({ profile: { ...state.profile, ...patch } });
  },

  updatePreferences(patch: Partial<Profile["preferences"]>) {
    set({
      profile: {
        ...state.profile,
        preferences: { ...state.profile.preferences, ...patch },
      },
    });
  },
};

const selectConversations = (s: LyricState) => s.conversations;
const selectMessages = (s: LyricState) => s.messages;

export function useConversations() {
  const conversations = useLyricStore(selectConversations);
  return useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversations],
  );
}

export function useMessages(conversationId: string | null) {
  const messages = useLyricStore(selectMessages);
  return useMemo(
    () => (conversationId ? messages.filter((m) => m.conversationId === conversationId) : []),
    [messages, conversationId],
  );
}
