import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/lyric/site-header";
import { SiteFooter } from "@/components/lyric/site-footer";
import { PLAN_CATALOG, type PlanId } from "@/lib/plan-config";
import { actions, useLyricStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Lyric Plans — Free, Plus $8 and Pro $20" },
      {
        name: "description",
        content:
          "Compare Lyric Free, Plus and Pro: daily AI messages, live web searches, conversation memory and premium features.",
      },
      { property: "og:title", content: "Lyric Plans — Free, Plus $8 and Pro $20" },
      {
        property: "og:description",
        content: "Choose the Lyric plan that fits how you learn and work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { user } = useAuth();
  const currentPlan = useLyricStore((s) => s.subscription.plan);
  const renewal = useLyricStore((s) => s.subscription.currentPeriodEnd);
  const navigate = useNavigate();
  const [pending, setPending] = useState<PlanId | null>(null);

  const choose = async (plan: PlanId) => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setPending(plan);
    try {
      await actions.selectPlan(plan);
      toast.success(`You're now on ${PLAN_CATALOG.find((p) => p.id === plan)?.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't change plan");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Plans</h1>
          <p className="text-muted-foreground">
            Free is genuinely useful. Upgrade when you need more.
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
            Payments not connected yet · plan changes apply instantly for testing
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_CATALOG.map((plan) => {
            const isCurrent = !!user && currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-3xl bg-surface p-6",
                  plan.id === "free" && "border border-hairline",
                  plan.id === "plus" && "border-2 border-brand",
                  plan.id === "pro" && "border-2 border-transparent bg-clip-padding shadow-[0_0_0_2px_var(--brand),0_20px_60px_-20px_var(--brand)]",
                )}
              >
                {plan.id === "plus" && (
                  <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg bg-brand px-3 py-1 text-[10px] font-bold uppercase text-brand-foreground">
                    <Sparkles className="size-3" /> Popular
                  </div>
                )}
                {plan.id === "pro" && (
                  <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg bg-brand-gradient px-3 py-1 text-[10px] font-bold uppercase text-brand-foreground">
                    <Crown className="size-3" /> Pro
                  </div>
                )}
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">{plan.blurb}</p>
                </div>
                <p className="mb-5">
                  <span className="text-4xl font-bold">{plan.priceLabel}</span>
                  <span className="text-sm text-muted-foreground"> /month</span>
                </p>

                <dl className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-hairline bg-background/40 p-3 text-center">
                  <Stat label="Messages / day" value={plan.limits.messagesPerDay} />
                  <Stat label="Searches / day" value={plan.limits.searchesPerDay} />
                  <Stat label="Memory (turns)" value={plan.limits.contextMessages} />
                </dl>

                <ul className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
                  {plan.highlights.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || pending !== null}
                  onClick={() => void choose(plan.id)}
                  className={cn(
                    "w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
                    plan.id === "free" && "border border-hairline text-foreground",
                    plan.id === "plus" && "bg-brand text-brand-foreground",
                    plan.id === "pro" && "bg-brand-gradient text-brand-foreground",
                  )}
                >
                  {isCurrent
                    ? "Current plan"
                    : pending === plan.id
                      ? "Switching…"
                      : !user
                        ? plan.id === "free"
                          ? "Start free"
                          : `Get ${plan.name}`
                        : plan.id === "free"
                          ? "Switch to Free"
                          : `Choose ${plan.name}`}
                </button>
                {isCurrent && plan.id !== "free" && renewal && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Renews {new Date(renewal).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-3xl border border-hairline bg-surface p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Allowances reset every day at midnight UTC. When you reach a limit Lyric tells you
            clearly — nothing fails silently.
          </p>
          <Link
            to="/chat"
            className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Go to chat
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}
