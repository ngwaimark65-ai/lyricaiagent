import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/lyric/site-header";
import { SiteFooter } from "@/components/lyric/site-footer";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Lyric Pricing — Free, Plus and Pro plans" },
      {
        name: "description",
        content:
          "Compare Lyric Free, Lyric Plus and Lyric Pro: AI chat, tutoring, quizzes, image questions and study tools.",
      },
      { property: "og:title", content: "Lyric Pricing — Free, Plus and Pro plans" },
      {
        property: "og:description",
        content: "Choose the Lyric plan that fits how you learn and work.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Simple Plans</h1>
          <p className="text-muted-foreground">Choose the Lyric experience that fits you.</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
            Payments not connected yet
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative overflow-hidden rounded-3xl bg-surface p-6",
                plan.highlighted ? "border-2 border-brand" : "border border-hairline",
              )}
            >
              {plan.highlighted && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-brand px-3 py-1 text-[10px] font-bold uppercase text-brand-foreground">
                  Popular
                </div>
              )}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">{plan.blurb}</p>
                </div>
                <span className="text-xl font-bold">{plan.price}</span>
              </div>
              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled
                className={cn(
                  "w-full rounded-xl py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                  plan.highlighted
                    ? "bg-brand text-brand-foreground"
                    : "border border-hairline text-foreground",
                )}
              >
                {plan.id === "free" ? "Current plan" : "Coming soon"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-hairline bg-surface p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Subscriptions are architected for a payment provider to be connected later. Plan limits
            already drive the usage meter across the app.
          </p>
          <Link
            to="/chat"
            className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Start with Free
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
