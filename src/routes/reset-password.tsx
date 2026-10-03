import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LyricLogo } from "@/components/lyric/logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Lyric" },
      { name: "description", content: "Choose a new password for your Lyric account." },
      { property: "og:title", content: "Set a new password — Lyric" },
      { property: "og:description", content: "Securely reset your Lyric password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecovery)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    void navigate({ to: "/chat" });
  };

  const input =
    "w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brand/60";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-veil" />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <LyricLogo />
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Set a new password</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Open this page from the reset link in your email. Link expired?{" "}
            <Link to="/auth" className="text-brand">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-brand-foreground shadow-brand-glow disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
