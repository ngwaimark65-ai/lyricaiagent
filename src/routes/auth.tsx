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
    sub: "Log in to pick up your conversations and study progress.",
    cta: "Log in",
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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) return void toast.error("Password must be at least 8 characters.");
      if (password !== confirmPassword) return void toast.error("Passwords don't match.");
    }
    if (mode === "login" && !password) return void toast.error("Please enter your password.");
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
            data: { display_name: fullName.trim(), full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        // Existing confirmed email: the provider returns a user with no identities.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("An account with this email already exists. Log in or use Forgot password.");
        }
        toast.success("Account created", {
          description: data.session
            ? "You're all set — taking you to your chat."
            : "Check your email for a confirmation link, then sign in.",
        });
        if (!data.session) setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent", { description: "Check your inbox for the link." });
        setMode("login");
      }
    } catch (error) {
      toast.error(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      const msg = String((result.error as { message?: string }).message ?? "");
      toast.error(/cancel|closed/i.test(msg) ? "Google sign-in was cancelled." : "Google sign-in failed. Please try again.");
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
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <h1 className="mb-2 text-2xl font-semibold">{copy.title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{copy.sub}</p>

        <form
          key={mode}
          className="space-y-4"
          noValidate={false}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === "signup" && (
            <Field id="signup-full-name" name="name" autoComplete="name" label="Full name" type="text" placeholder="Mark Ngwai" value={fullName} onChange={setFullName} />
          )}
          <Field id={`${mode}-email`} name="email" autoComplete="email" label="Email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} />
          {mode !== "forgot" && (
            <Field
              id={`${mode}-password`}
              name={mode === "signup" ? "new-password" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
            />
          )}
          {mode === "signup" && (
            <Field id="signup-confirm-password" name="confirm-password" autoComplete="new-password" label="Confirm password" type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} />
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
            <>
              <button onClick={() => setMode("forgot")} className="block w-full hover:text-foreground">
                Forgot password?
              </button>
              <button onClick={() => setMode("signup")} className="block w-full hover:text-foreground">
                New to Lyric? <span className="text-brand">Create an account</span>
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => setMode("login")} className="block w-full hover:text-foreground">
              Already have an account? <span className="text-brand">Log in</span>
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

function friendlyAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists. Log in or use Forgot password.";
  if (/pwned|weak|compromised|leaked/i.test(msg)) return "That password has appeared in a data breach. Please choose a different one.";
  if (/password/i.test(msg) && /characters|short/i.test(msg)) return "Password must be at least 8 characters.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  if (/HTTP 5\d\d|unavailable|timeout/i.test(msg)) return "Lyric's sign-in service is temporarily unavailable. Please try again in a minute.";
  if (/failed to fetch|network/i.test(msg)) return "Network problem — check your connection and try again.";
  if (/invalid.*email|email.*invalid/i.test(msg)) return "Please enter a valid email address.";
  return msg || "Something went wrong. Please try again.";
}

function Field({
  id,
  name,
  autoComplete,
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  name: string;
  autoComplete: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        id={id}
        name={name}
        autoComplete={autoComplete}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand/60"
      />
    </label>
  );
}
