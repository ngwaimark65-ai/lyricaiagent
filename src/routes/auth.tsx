import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LyricLogo } from "@/components/lyric/logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Lyric" },
      {
        name: "description",
        content:
          "Create a Lyric account or sign in to continue your conversations and study progress.",
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const copy = COPY[mode];

  // Already signed in (or just returned from Google) → go straight to chat.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/chat" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/chat" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created", {
          description: "You're all set — taking you to your chat.",
        });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Reset link sent", { description: "Check your inbox for the link." });
        setMode("login");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/chat" });
  };

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
            void submit();
          }}
        >
          {mode === "signup" && (
            <Field
              label="Full name"
              type="text"
              placeholder="Ada Lovelace"
              value={name}
              onChange={setName}
            />
          )}
          <Field
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
          />
          {mode !== "forgot" && (
            <Field
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-brand-foreground shadow-brand-glow transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Please wait…" : copy.cta}
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
              onClick={() => void google()}
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
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand/60"
      />
    </label>
  );
}
