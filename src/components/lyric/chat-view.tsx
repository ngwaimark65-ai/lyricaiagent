import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  Check,
  Copy,
  Image as ImageIcon,
  LogOut,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  PanelLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LyricLogo, LyricMark } from "@/components/lyric/logo";
import { Markdown } from "@/components/lyric/markdown";
import { UsageMeter } from "@/components/lyric/usage-meter";
import { actions, useConversations, useLyricStore, useMessages } from "@/lib/store";
import { SUBJECT_LABEL } from "@/lib/education";
import { useAuth } from "@/hooks/use-auth";
import type { Attachment, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** A user-facing upload error with a specific explanation. */
class UploadError extends Error {
  constructor(public title: string, public detail: string) {
    super(title);
  }
}

type ImageMime = "image/jpeg" | "image/png" | "image/webp";

/** Detects the real format from the file's first bytes (Android often reports a blank or wrong MIME type). */
function sniffImageType(bytes: Uint8Array): ImageMime | "image/heic" | "image/gif" | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (s: number, e: number) => String.fromCharCode(...b.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 3) === "GIF") return "image/gif";
  if (ascii(4, 8) === "ftyp" && /hei|hev|mif|avif/.test(ascii(8, 12))) return "image/heic";
  return null;
}

/**
 * Reads the bytes immediately (before the picker input is reset), checks the real
 * format, then returns a correctly-typed Blob ready for decoding/compression.
 */
async function readImageFile(file: File): Promise<Blob> {
  if (file.size === 0) {
    throw new UploadError(
      `${file.name} is empty`,
      "Your phone gave Lyric an empty file. If the photo is in Google Photos or the cloud, download it to your device first.",
    );
  }
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    console.warn("[upload] could not read file bytes:", (error as Error)?.name);
    throw new UploadError(
      `Lyric couldn't access ${file.name}`,
      "Your phone blocked access to this photo. Try choosing it from Files or Gallery, or save a copy to your device first.",
    );
  }
  const type = sniffImageType(new Uint8Array(buffer, 0, Math.min(32, buffer.byteLength)));
  if (type === "image/heic") {
    throw new UploadError(`${file.name} is a HEIC photo`, "Your browser can't open HEIC. Change your camera format to JPG, or take a screenshot of it and upload that.");
  }
  if (type === "image/gif") {
    throw new UploadError(`${file.name} is a GIF`, "Use a JPG, PNG or WEBP image.");
  }
  if (!type) {
    throw new UploadError(`${file.name} isn't a supported image`, "Its contents aren't JPG, PNG or WEBP. Try a different photo.");
  }
  return new Blob([buffer], { type });
}

/** Downscales to at most 1280px and re-encodes as JPEG so images stay small enough to save and send. */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });
}

// Uses a plain <img> decode (works in phone browsers where createImageBitmap fails on large camera photos).
async function decodeAny(file: Blob, objectUrl: string): Promise<CanvasImageSource & { width: number; height: number }> {
  // Try several decoders: phone webviews often fail one of them on camera photos.
  try {
    const img = await loadImage(objectUrl);
    if (img.naturalWidth && img.naturalHeight) return img;
  } catch { /* next */ }
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch { /* next */ }
  }
  const img = await loadImage(await readAsDataUrl(file));
  if (!img.naturalWidth) throw new Error("empty image");
  return img;
}

async function compressImage(file: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await decodeAny(file, objectUrl);
    const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    if (!w || !h) throw new Error("empty image");
    // 1280px keeps canvas memory low on phones while staying legible for handwriting.
    const scale = Math.min(1, 1280 / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", 0.85);
    if (!out.startsWith("data:image/jpeg")) throw new Error("encode failed");
    return out;
  } catch (error) {
    console.warn("[upload] decode/compress failed:", (error as Error)?.message);
    // Last resort: send the original (already type-checked) file if it's small enough.
    if (file.size <= 2.9 * 1024 * 1024) return readAsDataUrl(file);
    throw new UploadError(
      "This photo is too large for your browser to process",
      "Try a smaller photo or a screenshot of it.",
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const STARTERS = [
  "What is photosynthesis?",
  "Help me write an email to my landlord",
  "Explain quantum physics simply",
  "Give me three business ideas",
  "What is 25% of 840?",
];

/**
 * The chat surface. `conversationId` always comes from the route, so a refresh
 * restores exactly the thread in the URL.
 */
export function ChatView({ conversationId }: { conversationId: string | null }) {
  const conversations = useConversations();
  const messages = useMessages(conversationId);
  const loadingMessages = useLyricStore((s) => s.loadingMessages);
  const active = conversations.find((c) => c.id === conversationId) ?? null;
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void actions.selectConversation(conversationId);
  }, [conversationId]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [conversationId]);

  const filtered = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
    [conversations, query],
  );

  const send = async (text: string, attachments: Attachment[] = []) => {
    let id = conversationId;
    if (!id) {
      const created = await actions.createConversation();
      if (!created) {
        toast.error("Couldn't start a new conversation. Please try again.");
        return;
      }
      id = created.id;
      void navigate({ to: "/chat/$conversationId", params: { conversationId: id } });
    }
    void actions.sendMessage(id, text, attachments);
  };

  const newConversation = () => {
    setSidebarOpen(false);
    void navigate({ to: "/chat" });
  };

  const removeConversation = async (id: string) => {
    await actions.deleteConversation(id);
    if (id === conversationId) void navigate({ to: "/chat" });
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
            onClick={newConversation}
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
                "group flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors",
                c.id === conversationId
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:bg-surface",
              )}
            >
              {renamingId === c.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    void actions.renameConversation(c.id, renameValue);
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void actions.renameConversation(c.id, renameValue);
                      setRenamingId(null);
                    }
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="min-w-0 flex-1 rounded-md border border-brand/50 bg-background px-2 py-1 text-sm outline-none"
                />
              ) : (
                <>
                  <Link
                    to="/chat/$conversationId"
                    params={{ conversationId: c.id }}
                    onClick={() => setSidebarOpen(false)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {c.title}
                  </Link>
                  <button
                    onClick={() => {
                      setRenamingId(c.id);
                      setRenameValue(c.title);
                    }}
                    className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100"
                    aria-label="Rename conversation"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => void removeConversation(c.id)}
                    className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-hairline p-3">
          <UsageMeter compact />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
            <button
              onClick={() => void signOut()}
              className="ml-auto flex items-center gap-1 hover:text-foreground"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
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
              loadingMessages && conversationId ? (
                <p className="py-16 text-center text-xs text-muted-foreground">
                  Loading conversation…
                </p>
              ) : (
                <EmptyState onPick={(text) => void send(text)} />
              )
            ) : (
              <MessageThread messages={messages} conversationId={conversationId!} />
            )}
          </div>
        </div>

        <Composer
          textareaRef={composerRef}
          onSend={(text, attachments) => void send(text, attachments)}
          busy={messages.some((m) => m.streaming)}
        />
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
          <div key={m.id} className="group flex justify-end">
            <div className="max-w-[80%] space-y-2">
              {m.attachments?.map((a) => (
                <img
                  key={a.id}
                  src={a.url}
                  alt={a.name}
                  className="ml-auto max-h-48 rounded-2xl border border-hairline object-cover"
                />
              ))}
              {editingId === m.id ? (
                <div className="space-y-2 rounded-2xl border border-brand/40 bg-surface p-3">
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const next = editValue.trim();
                        setEditingId(null);
                        if (next && next !== m.content) void actions.editMessage(m.id, next);
                      }}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl rounded-tr-none bg-surface-2 px-4 py-3 text-sm">
                    {m.content}
                  </div>
                  <div className="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                    <CopyButton text={m.content} />
                    <MessageAction
                      label="Edit message"
                      onClick={() => {
                        setEditingId(m.id);
                        setEditValue(m.content);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </MessageAction>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div key={m.id} className="group flex gap-3">
            <LyricMark className="mt-0.5 shrink-0" />
            <div className="min-w-0 max-w-[90%] space-y-2">
              <div
                className={cn(
                  "text-sm leading-relaxed",
                  m.pending || m.errored
                    ? "rounded-2xl border border-dashed border-hairline bg-surface px-4 py-3 text-muted-foreground"
                    : "text-foreground/90",
                )}
              >
                {m.streaming && !m.content ? <TypingDots /> : <Markdown text={m.content} />}
              </div>
              {!m.streaming && (
                <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <CopyButton text={m.content} />
                  <MessageAction
                    label="Regenerate response"
                    onClick={() => void actions.regenerate(m.id)}
                  >
                    <RefreshCw className="size-3.5" />
                  </MessageAction>
                </div>
              )}
            </div>
          </div>
        ),
      )}

      {showQuizOffer && <QuizOffer conversationId={conversationId} />}
      <div ref={endRef} />
    </div>
  );
}

function MessageAction({
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
      title={label}
      className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <MessageAction
      label={copied ? "Copied" : "Copy message"}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <span className="flex items-center gap-1 text-xs text-success">
          <Check className="size-3.5" /> Copied
        </span>
      ) : (
        <Copy className="size-3.5" />
      )}
    </MessageAction>
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

function Composer({
  onSend,
  busy,
  textareaRef,
}: {
  onSend: (text: string, attachments: Attachment[]) => void;
  busy: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (busy) return;
    if (!value.trim() && attachments.length === 0) return;
    onSend(value.trim() || "Please look at this.", attachments);
    setValue("");
    setAttachments([]);
    textareaRef.current?.focus();
  };

  const addFiles = async (files: File[] | FileList | null, kind: Attachment["kind"]) => {
    if (!files || files.length === 0) return;
    if (kind === "file") {
      toast("Only images are supported right now", {
        description: "Use the image button to add a JPG, PNG or WEBP.",
      });
      return;
    }
    for (const file of Array.from(files)) {
      if (attachments.length >= 4) {
        toast.error("You can attach up to 4 images per message.");
        break;
      }
      // Android pickers often report a blank type; the real format is checked from the bytes below.
      const looksLikeImage =
        ALLOWED_IMAGE_TYPES.includes(file.type) ||
        file.type === "" ||
        file.type === "application/octet-stream" ||
        /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!looksLikeImage) {
        toast.error(`${file.name} isn't supported`, { description: "Use a JPG, PNG or WEBP image." });
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} is too large`, { description: "Images must be under 10 MB." });
        continue;
      }
      try {
        const blob = await readImageFile(file);
        const url = await compressImage(blob);
        setAttachments((prev) =>
          prev.length >= 4
            ? prev
            : [...prev, { id: Math.random().toString(36).slice(2), kind: "image", name: file.name, url, size: file.size }],
        );
      } catch (error) {
        if (error instanceof UploadError) {
          toast.error(error.title, { description: error.detail });
        } else {
          console.warn("[upload] unexpected error:", (error as Error)?.name, (error as Error)?.message);
          toast.error(`${file.name} couldn't be added`, { description: "Something went wrong preparing this image. Try again." });
        }
      }
    }
  };

  return (
    <div className="border-t border-hairline bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <LimitBanner />

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span key={a.id} className="relative">
                <img
                  src={a.url}
                  alt={a.name}
                  className="size-16 rounded-lg border border-hairline object-cover"
                />
                <button
                  onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                  aria-label="Remove image"
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-hairline bg-background text-foreground"
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
            ref={textareaRef}
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
            disabled={busy || (!value.trim() && attachments.length === 0)}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          Lyric can make mistakes. Check important information.
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
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            // Snapshot the files and only reset the input after they've been read —
            // resetting first can revoke access to the photo on Android.
            const input = e.currentTarget;
            const picked = Array.from(input.files ?? []);
            void addFiles(picked, "image").finally(() => {
              input.value = "";
            });
          }}
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

/** Explains a reached allowance instead of failing silently. */
function LimitBanner() {
  const notice = useLyricStore((s) => s.limitNotice);
  const usage = useLyricStore((s) => s.usage);
  const plan = useLyricStore((s) => s.subscription.plan);
  const messagesOut = usage.messagesUsed >= usage.messagesLimit;
  const searchesOut = usage.searchesUsed >= usage.searchesLimit;

  const text =
    notice ??
    (messagesOut
      ? `You've used all ${usage.messagesLimit} AI messages for today. Your allowance resets at midnight UTC.`
      : searchesOut
        ? `You've used all ${usage.searchesLimit} live web searches for today. Lyric still answers, but current-events questions won't be checked against the web until it resets.`
        : null);
  if (!text) return null;

  return (
    <div
      role="status"
      className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm"
    >
      <p className="flex-1 text-foreground">{text}</p>
      <div className="flex items-center gap-2">
        {plan !== "pro" && (
          <Link
            to="/pricing"
            className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
          >
            See upgrade options
          </Link>
        )}
        {notice && (
          <button
            onClick={() => actions.dismissLimitNotice()}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
