import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LyricLogo } from "@/components/lyric/logo";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Lyric" },
      {
        name: "description",
        content: "Create a Lyric account or sign in to continue your conversations and study progress.",
      },
      { property: "og:title", content: "Sign in to Lyric" },
      { property: "og:description", content: "One AI. Everything you need." },
    ],
  }),
  component: AuthPage,
});

const COPY: Record<Mode, { title: string; sub: string; cta: string }> = {
  login: {
    title: "Welcome back",
    sub: "Sign in to pick up your conversations and study progress.",
    cta: "Sign in",
  },
  signup: {
    title: "Create your account",
    sub: "Start with Lyric Free. No credit card required.",
    cta: "Create account",
  },
  forgot: {
    title: "Reset your password",
    sub: "We'll send a reset link to your email address.",
    cta: "Send reset link",
  },
};

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const copy = COPY[mode];

  const notConnected = () =>
    toast("Authentication isn't connected yet", {
      description: "This form is wired for Lovable Cloud auth to be enabled in a later step.",
    });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-veil" />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <LyricLogo />
        </div>

        {mode !== "forgot" && (
          <div className="mb-8 grid grid-cols-2 gap-1 rounded-xl border border-hairline bg-surface p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium transition-colors",
                  mode === m ? "bg-surface-2 text-foreground" : "text-muted-foreground",
                )}
              >
                {m === "login" ? "Login" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <h1 className="mb-2 text-2xl font-semibold">{copy.title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{copy.sub}</p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            notConnected();
          }}
        >
          {mode === "signup" && <Field label="Full name" type="text" placeholder="Ada Lovelace" />}
          <Field label="Email" type="email" placeholder="you@example.com" />
          {mode !== "forgot" && (
            <Field label="Password" type="password" placeholder="••••••••" />
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-brand-foreground shadow-brand-glow transition-transform active:scale-[0.99]"
          >
            {copy.cta}
          </button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={notConnected}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-hairline bg-surface py-3.5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              <span className="grid size-5 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
                G
              </span>
              Continue with Google
            </button>
          </>
        )}

        <div className="mt-8 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <button onClick={() => setMode("forgot")} className="hover:text-foreground">
              Forgot your password?
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("login")} className="hover:text-foreground">
              Back to sign in
            </button>
          )}
          <p className="text-xs text-muted-foreground/70">
            <Link to="/" className="hover:text-foreground">
              Back to lyric.com
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
}: {
  label: string;
  type: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand/60"
      />
    </label>
  );
}
