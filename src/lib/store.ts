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
import { shouldSearchWeb } from "./search-trigger";

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
   * Appends the user's turn, then streams a real reply from the Lyric AI
   * endpoint into an assistant message. Nothing is ever invented locally:
   * failures surface as an explicit error message.
   */
  async sendMessage(conversationId: string, content: string, attachments: Attachment[] = []) {
    const now = new Date().toISOString();
    const conversation = state.conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const subject = detectSubject(content) ?? conversation.subject;
    const educational = conversation.educational || isEducational(content);
    const isFirst = !state.messages.some((m) => m.conversationId === conversationId);
    const hasImage = attachments.some((a) => a.kind === "image");
    const useSearch = shouldSearchWeb(content);

    const userMessage: Message = {
      id: uid(),
      conversationId,
      role: "user",
      content,
      attachments,
      createdAt: now,
    };

    const replyId = uid();
    const reply: Message = {
      id: replyId,
      conversationId,
      role: "assistant",
      content: "",
      createdAt: now,
      streaming: true,
    };

    const history = state.messages
      .filter((m) => m.conversationId === conversationId && !m.errored && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    set({
      messages: [...state.messages, userMessage, reply],
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

    actions.consumeUsage(hasImage ? "vision.solve" : "chat.message");

    const patchReply = (patch: Partial<Message>) => {
      set({
        messages: state.messages.map((m) => (m.id === replyId ? { ...m, ...patch } : m)),
      });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...history,
            {
              role: "user",
              content: hasImage
                ? `${content}\n\n(The user attached an image. Image understanding isn't connected yet — ask them to describe or type out what it shows.)`
                : content,
            },
            ],
            preferences: state.profile.preferences,
            useSearch,
          }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        patchReply({
          streaming: false,
          errored: true,
          content: detail || "Lyric couldn't reach the AI model. Please try again.",
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        patchReply({ content: text });
      }
      patchReply({
        content: text.trim() || "The model returned an empty response. Please try again.",
        streaming: false,
      });
    } catch {
      patchReply({
        streaming: false,
        errored: true,
        content: "Network error while contacting Lyric's AI. Please check your connection and try again.",
      });
    }
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
