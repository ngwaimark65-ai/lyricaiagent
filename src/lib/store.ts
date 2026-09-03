import { useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Attachment,
  Conversation,
  LearningPreferences,
  Message,
  Profile,
  Subject,
  UsageOperation,
  UsageState,
} from "./types";
import { USAGE_COST } from "./types";
import { detectSubject, isEducational } from "./education";
import { shouldSearchWeb } from "./search-trigger";

/**
 * Client store backed by Lovable Cloud.
 *
 * Conversations and messages live in the database, scoped to the signed-in
 * user by row-level security. This module keeps a small in-memory mirror so
 * the UI stays instant while writes go to the backend.
 */

interface LyricState {
  userId: string | null;
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  profile: Profile;
  usage: UsageState;
  loadingConversations: boolean;
  loadingMessages: boolean;
}

/** Recent conversations only — older ones load on demand. */
const CONVERSATION_PAGE = 40;
const MESSAGE_PAGE = 200;

const defaultProfile: Profile = {
  id: "",
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
  userId: null,
  conversations: [],
  messages: [],
  activeConversationId: null,
  profile: defaultProfile,
  usage: { used: 0, allowance: 60, resetsAt: "Resets daily" },
  loadingConversations: false,
  loadingMessages: false,
};

let state: LyricState = initialState;
const listeners = new Set<() => void>();

function set(next: Partial<LyricState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
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

type ConversationRow = {
  id: string;
  title: string;
  subject: string | null;
  educational: boolean;
  quiz_offered: boolean;
  quiz_declined: boolean;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  attachments: unknown;
  errored: boolean;
  created_at: string;
};

const toConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  subject: (row.subject as Subject | null) ?? null,
  educational: row.educational,
  quizOffered: row.quiz_offered,
  quizDeclined: row.quiz_declined,
});

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role as Message["role"],
  content: row.content,
  attachments: Array.isArray(row.attachments) ? (row.attachments as Attachment[]) : [],
  errored: row.errored,
  createdAt: row.created_at,
});

function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "New conversation";
}

export const actions = {
  /** Loads the signed-in user's profile and recent conversations. */
  async loadForUser(userId: string) {
    if (state.userId === userId && state.conversations.length > 0) return;
    set({ userId, loadingConversations: true });

    const [{ data: profileRow }, { data: convoRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(CONVERSATION_PAGE),
    ]);

    const preferences = (profileRow?.preferences ?? {}) as Partial<LearningPreferences>;
    set({
      loadingConversations: false,
      profile: {
        id: userId,
        displayName: profileRow?.display_name ?? "",
        email: profileRow?.email ?? "",
        plan: (profileRow?.plan as Profile["plan"]) ?? "free",
        preferences: { ...defaultProfile.preferences, ...preferences },
      },
      conversations: (convoRows ?? []).map((r) => toConversation(r as ConversationRow)),
    });
  },

  reset() {
    state = initialState;
    listeners.forEach((l) => l());
  },

  async createConversation(title = "New conversation"): Promise<Conversation | null> {
    const userId = state.userId;
    if (!userId) return null;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title })
      .select()
      .single();
    if (error || !data) return null;
    const conversation = toConversation(data as ConversationRow);
    set({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
      messages: state.messages.filter((m) => m.conversationId !== conversation.id),
    });
    return conversation;
  },

  async selectConversation(id: string | null) {
    set({ activeConversationId: id });
    if (!id) return;
    if (state.messages.some((m) => m.conversationId === id)) return;
    set({ loadingMessages: true });
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_PAGE);
    set({
      loadingMessages: false,
      messages: [
        ...state.messages.filter((m) => m.conversationId !== id),
        ...(data ?? []).map((r) => toMessage(r as MessageRow)),
      ],
    });
  },

  async deleteConversation(id: string) {
    set({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: state.messages.filter((m) => m.conversationId !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    });
    await supabase.from("conversations").delete().eq("id", id);
  },

  async renameConversation(id: string, title: string) {
    const next = title.trim() || "Untitled conversation";
    set({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title: next } : c)),
    });
    await supabase.from("conversations").update({ title: next }).eq("id", id);
  },

  /**
   * Appends the user's turn, then streams a real reply from the Lyric AI
   * endpoint. Both turns are persisted so a refresh restores the thread.
   */
  async sendMessage(conversationId: string, content: string, attachments: Attachment[] = []) {
    await runTurn(conversationId, content, attachments, true);
  },

  /** Rewrites a previous user message, drops everything after it, re-answers. */
  async editMessage(messageId: string, content: string) {
    const target = state.messages.find((m) => m.id === messageId);
    if (!target || target.role !== "user") return;
    const conversationId = target.conversationId;
    const thread = state.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const index = thread.findIndex((m) => m.id === messageId);
    const removed = thread.slice(index);

    set({
      messages: state.messages.filter((m) => !removed.some((r) => r.id === m.id)),
    });
    await supabase
      .from("messages")
      .delete()
      .in(
        "id",
        removed.map((m) => m.id),
      );

    await runTurn(conversationId, content, target.attachments ?? [], true);
  },

  /** Regenerates the assistant reply that follows the given assistant message. */
  async regenerate(messageId: string) {
    const target = state.messages.find((m) => m.id === messageId);
    if (!target || target.role !== "assistant") return;
    const conversationId = target.conversationId;
    const thread = state.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const index = thread.findIndex((m) => m.id === messageId);
    const lastUser = [...thread.slice(0, index)].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const removed = thread.slice(index);

    set({ messages: state.messages.filter((m) => !removed.some((r) => r.id === m.id)) });
    await supabase
      .from("messages")
      .delete()
      .in(
        "id",
        removed.map((m) => m.id),
      );

    await runTurn(conversationId, lastUser.content, [], false);
  },

  markQuizOffered(conversationId: string) {
    set({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, quizOffered: true } : c,
      ),
    });
    void supabase.from("conversations").update({ quiz_offered: true }).eq("id", conversationId);
  },

  declineQuiz(conversationId: string) {
    set({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, quizOffered: true, quizDeclined: true } : c,
      ),
    });
    void supabase
      .from("conversations")
      .update({ quiz_offered: true, quiz_declined: true })
      .eq("id", conversationId);
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
    const profile = { ...state.profile, ...patch };
    set({ profile });
    if (!state.userId) return;
    void supabase
      .from("profiles")
      .update({ display_name: profile.displayName, email: profile.email })
      .eq("id", state.userId);
  },

  updatePreferences(patch: Partial<LearningPreferences>) {
    const preferences = { ...state.profile.preferences, ...patch };
    set({ profile: { ...state.profile, preferences } });
    if (!state.userId) return;
    void supabase.from("profiles").update({ preferences }).eq("id", state.userId);
  },
};

/**
 * One question → one streamed answer. `persistUser` is false when the user
 * turn already exists (regenerate).
 */
async function runTurn(
  conversationId: string,
  content: string,
  attachments: Attachment[],
  persistUser: boolean,
) {
  const userId = state.userId;
  if (!userId) return;
  const now = new Date().toISOString();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation) return;

  const subject = detectSubject(content) ?? conversation.subject;
  const educational = conversation.educational || isEducational(content);
  const isFirst = !state.messages.some((m) => m.conversationId === conversationId);
  const hasImage = attachments.some((a) => a.kind === "image");
  const useSearch = shouldSearchWeb(content);
  const title = isFirst ? titleFrom(content) : conversation.title;

  const history = state.messages
    .filter((m) => m.conversationId === conversationId && !m.errored && m.content)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => ({ role: m.role, content: m.content }));

  const localUserId = uid();
  const replyId = uid();
  const optimistic: Message[] = [];
  if (persistUser) {
    optimistic.push({
      id: localUserId,
      conversationId,
      role: "user",
      content,
      attachments,
      createdAt: now,
    });
  }
  optimistic.push({
    id: replyId,
    conversationId,
    role: "assistant",
    content: "",
    createdAt: new Date(Date.now() + 1).toISOString(),
    streaming: true,
  });

  set({
    messages: [...state.messages, ...optimistic],
    conversations: state.conversations.map((c) =>
      c.id === conversationId
        ? { ...c, subject, educational, title, updatedAt: now }
        : c,
    ),
  });

  actions.consumeUsage(hasImage ? "vision.solve" : "chat.message");

  void supabase
    .from("conversations")
    .update({
      subject,
      educational,
      title,
      updated_at: now,
    })
    .eq("id", conversationId);

  if (persistUser) {
    const { data } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content,
        attachments: attachments as unknown as never,
      })
      .select()
      .single();
    if (data) {
      const saved = toMessage(data as MessageRow);
      set({
        messages: state.messages.map((m) => (m.id === localUserId ? saved : m)),
      });
    }
  }

  const patchReply = (patch: Partial<Message>) => {
    set({ messages: state.messages.map((m) => (m.id === replyId ? { ...m, ...patch } : m)) });
  };

  const persistReply = async (text: string, errored: boolean) => {
    const { data } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "assistant",
        content: text,
        errored,
      })
      .select()
      .single();
    if (data) {
      const saved = toMessage(data as MessageRow);
      set({ messages: state.messages.map((m) => (m.id === replyId ? saved : m)) });
    }
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
      const message = detail || "Lyric couldn't reach the AI model. Please try again.";
      patchReply({ streaming: false, errored: true, content: message });
      await persistReply(message, true);
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
    const final = text.trim() || "The model returned an empty response. Please try again.";
    patchReply({ content: final, streaming: false });
    await persistReply(final, false);
  } catch {
    const message =
      "Network error while contacting Lyric's AI. Please check your connection and try again.";
    patchReply({ streaming: false, errored: true, content: message });
    await persistReply(message, true);
  }
}

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
    () =>
      conversationId
        ? messages
            .filter((m) => m.conversationId === conversationId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : [],
    [messages, conversationId],
  );
}
