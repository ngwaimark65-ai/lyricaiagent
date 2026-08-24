import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUp,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Plus,
  Search,
  Trash2,
  PanelLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LyricLogo, LyricMark } from "@/components/lyric/logo";
import { UsageMeter } from "@/components/lyric/usage-meter";
import { actions, useConversations, useLyricStore, useMessages } from "@/lib/store";
import { SUBJECT_LABEL } from "@/lib/education";
import type { Attachment, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Lyric Chat — ask anything, learn anything" },
      {
        name: "description",
        content:
          "Chat with Lyric about everyday questions, work and study. Tutoring, quizzes and image questions are built in.",
      },
      { property: "og:title", content: "Lyric Chat — ask anything, learn anything" },
      {
        property: "og:description",
        content: "A general AI assistant with education intelligence built in.",
      },
    ],
  }),
  component: ChatPage,
});

const STARTERS = [
  "What is photosynthesis?",
  "Help me write an email to my landlord",
  "Explain quantum physics simply",
  "Give me three business ideas",
  "What is 25% of 840?",
];

function ChatPage() {
  const conversations = useConversations();
  const activeId = useLyricStore((s) => s.activeConversationId);
  const messages = useMessages(activeId);
  const active = conversations.find((c) => c.id === activeId) ?? null;

  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
    [conversations, query],
  );

  const send = (text: string, attachments: Attachment[] = []) => {
    const id = activeId ?? actions.createConversation().id;
    actions.sendMessage(id, text, attachments);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-hairline bg-sidebar transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <LyricLogo />
          <button
            className="text-muted-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 px-4">
          <button
            onClick={() => {
              actions.createConversation();
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-brand-glow"
          >
            <Plus className="size-4" /> New conversation
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-xl border border-hairline bg-surface py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-brand/60"
            />
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              No conversations yet.
            </p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                c.id === activeId ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface",
              )}
            >
              <button
                onClick={() => {
                  actions.selectConversation(c.id);
                  setSidebarOpen(false);
                }}
                className="flex-1 truncate text-left"
              >
                {c.title}
              </button>
              <button
                onClick={() => actions.deleteConversation(c.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete conversation"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline p-3">
          <UsageMeter compact />
          <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>·</span>
            <Link to="/tools" className="hover:text-foreground">
              Tools
            </Link>
            <span>·</span>
            <Link to="/settings" className="hover:text-foreground">
              Settings
            </Link>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="text-muted-foreground lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <PanelLeft className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span className="truncate text-xs font-medium text-muted-foreground">
                {active
                  ? active.subject
                    ? `${SUBJECT_LABEL[active.subject]} session`
                    : active.title
                  : "New conversation"}
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Free
          </span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              <MessageThread messages={messages} conversationId={activeId!} />
            )}
          </div>
        </div>

        <Composer onSend={send} busy={messages.some((m) => m.streaming)} />
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center animate-fade-up">
      <LyricMark className="size-12 rounded-2xl" />
      <h1 className="mt-6 text-2xl font-semibold">Ask Lyric anything</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Everyday questions, work, or study. Lyric recognises when you're learning and offers
        tutoring tools.
      </p>
      <div className="mt-8 flex w-full max-w-md flex-col gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-hairline bg-surface px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageThread({
  messages,
  conversationId,
}: {
  messages: Message[];
  conversationId: string;
}) {
  const conversation = useConversations().find((c) => c.id === conversationId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const educationalTurns = messages.filter((m) => m.role === "user").length;
  const showQuizOffer =
    !!conversation?.educational && educationalTurns >= 2 && !conversation.quizDeclined;

  return (
    <div className="space-y-6">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[80%] space-y-2">
              {m.attachments?.map((a) => (
                <img
                  key={a.id}
                  src={a.url}
                  alt={a.name}
                  className="ml-auto max-h-48 rounded-2xl border border-hairline object-cover"
                />
              ))}
              <div className="rounded-2xl rounded-tr-none bg-surface-2 px-4 py-3 text-sm">
                {m.content}
              </div>
            </div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-3">
            <LyricMark className="mt-0.5 shrink-0" />
            <div
              className={cn(
                "max-w-[90%] whitespace-pre-wrap text-sm leading-relaxed",
                m.pending || m.errored
                  ? "rounded-2xl border border-dashed border-hairline bg-surface px-4 py-3 text-muted-foreground"
                  : "text-foreground/90",
              )}
            >
              {m.streaming && !m.content ? <TypingDots /> : m.content}
            </div>
          </div>
        ),
      )}

      {showQuizOffer && <QuizOffer conversationId={conversationId} />}
      <div ref={endRef} />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-label="Lyric is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function QuizOffer({ conversationId }: { conversationId: string }) {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <div className="ml-10 space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-brand">
          Quiz session
        </p>
        <p className="text-sm text-foreground">
          Quiz generation needs a connected AI model. Once it's wired up, Lyric will ask one
          question at a time, mark each answer, explain it, then show your score and weak areas.
        </p>
        <button
          onClick={() => setStarted(false)}
          className="rounded-lg bg-surface-2 px-4 py-2 text-xs font-semibold"
        >
          Back to chat
        </button>
      </div>
    );
  }

  return (
    <div className="ml-10 space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 animate-fade-up">
      <p className="font-mono text-xs font-medium uppercase tracking-widest text-brand">
        Lyric study co-pilot
      </p>
      <p className="text-sm text-foreground">
        I noticed you're studying this topic. Would you like me to give you a short quiz on it?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            actions.markQuizOffered(conversationId);
            actions.consumeUsage("quiz.generate");
            setStarted(true);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
        >
          Yes, quiz me
        </button>
        <button
          onClick={() => actions.declineQuiz(conversationId)}
          className="rounded-lg bg-surface-2 px-4 py-2 text-xs font-semibold"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function Composer({ onSend }: { onSend: (text: string, attachments: Attachment[]) => void }) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!value.trim() && attachments.length === 0) return;
    onSend(value.trim() || "Please look at this.", attachments);
    setValue("");
    setAttachments([]);
  };

  const addFiles = (files: FileList | null, kind: Attachment["kind"]) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2),
      kind,
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  return (
    <div className="border-t border-hairline bg-background p-4">
      <div className="mx-auto max-w-3xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-muted-foreground"
              >
                {a.name}
                <button
                  onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                  aria-label="Remove attachment"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-hairline bg-surface p-2 focus-within:border-brand/50">
          <div className="flex gap-1 pb-1">
            <IconButton label="Attach file" onClick={() => fileRef.current?.click()}>
              <Paperclip className="size-4" />
            </IconButton>
            <IconButton label="Upload image" onClick={() => imageRef.current?.click()}>
              <ImageIcon className="size-4" />
            </IconButton>
            <IconButton
              label="Voice input"
              onClick={() =>
                toast("Voice input isn't available yet", {
                  description: "The composer is ready for a speech API to be connected.",
                })
              }
            >
              <Mic className="size-4" />
            </IconButton>
          </div>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask anything..."
            className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/60"
          />

          <button
            onClick={submit}
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground disabled:opacity-40"
            disabled={!value.trim() && attachments.length === 0}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          Lyric can make mistakes. Model responses are not connected yet.
        </p>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => addFiles(e.target.files, "file")}
        />
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files, "image")}
        />
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}
