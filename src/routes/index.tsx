import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/lyric/site-header";
import { SiteFooter } from "@/components/lyric/site-footer";
import { LyricMark } from "@/components/lyric/logo";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lyric — One AI. Everything you need." },
      {
        name: "description",
        content:
          "Lyric is a general-purpose AI assistant with tutoring, quizzes and image questions built in. Ask anything, then learn it properly.",
      },
      { property: "og:title", content: "Lyric — One AI. Everything you need." },
      {
        property: "og:description",
        content:
          "A general AI assistant for everyday questions, work and study, with education intelligence built in.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "Ask anything",
    body: "Everyday questions, writing, research, code, business ideas or maths. Lyric is a general assistant first.",
  },
  {
    title: "Education intelligence",
    body: "Lyric recognises when a conversation turns into studying and shifts into step-by-step teaching.",
  },
  {
    title: "Built-in study tools",
    body: "Quizzes, flashcards, study plans and image questions live inside the same chat, not a separate app.",
  },
];

const FAQS = [
  {
    q: "Is Lyric only for students?",
    a: "No. Lyric answers anything — emails, research, code, planning. The education features are an extra layer, not a limit.",
  },
  {
    q: "How does the quiz feature work?",
    a: "When Lyric notices you're learning a topic, it offers a short quiz. It asks one question at a time, marks your answer, explains it, then shows your score and weak areas.",
  },
  {
    q: "Can I upload homework photos?",
    a: "Yes — the composer accepts images of homework, textbook pages, handwritten work, diagrams and equations. Vision analysis connects in a later step.",
  },
  {
    q: "Do I need a credit card?",
    a: "No. Lyric Free covers general chat, basic tutoring and limited quizzes and image questions.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-veil" />
        <div className="relative mx-auto max-w-2xl animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-brand">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            v2.0 Education Engine
          </div>
          <h1 className="mb-6 text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            One AI.
            <br />
            Everything you need.
          </h1>
          <p className="mx-auto mb-8 max-w-sm text-lg leading-relaxed text-muted-foreground">
            Lyric answers your everyday questions and helps you learn, study and create.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/chat"
              className="w-full rounded-2xl bg-brand py-4 text-center font-semibold text-brand-foreground shadow-brand-glow transition-transform active:scale-[0.99] sm:mx-auto sm:w-64"
            >
              Try Lyric
            </Link>
            <p className="text-xs text-muted-foreground/70">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl border border-hairline bg-surface p-6">
              <h2 className="text-sm font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Education showcase */}
      <section className="border-y border-hairline bg-surface/40 px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-semibold">Intelligent Tutoring</h2>
            <p className="text-sm text-muted-foreground">
              Lyric recognises when you're learning and adapts its response style.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-hairline bg-background shadow-elevated">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success" />
                <span className="text-xs font-medium text-muted-foreground">Biology session</span>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Plus
              </span>
            </div>

            <div className="space-y-6 p-4">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-surface-2 px-4 py-3 text-sm">
                  What is the mitochondria?
                </div>
              </div>

              <div className="flex gap-3">
                <LyricMark className="mt-0.5 shrink-0" />
                <div className="max-w-[90%] space-y-4">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    The mitochondria is often called the powerhouse of the cell. It's an organelle
                    that generates most of the cell's supply of ATP.
                  </p>

                  <div className="space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
                    <p className="font-mono text-xs font-medium uppercase tracking-widest text-brand">
                      Lyric study co-pilot
                    </p>
                    <p className="text-sm">
                      I noticed you're exploring cell biology. Would you like a quick quiz on
                      organelles?
                    </p>
                    <div className="flex gap-2">
                      <Link
                        to="/chat"
                        className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
                      >
                        Yes, quiz me
                      </Link>
                      <Link
                        to="/chat"
                        className="rounded-lg bg-surface-2 px-4 py-2 text-xs font-semibold"
                      >
                        Not now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-hairline p-4">
              <Link
                to="/chat"
                className="flex h-12 w-full items-center rounded-xl border border-hairline bg-surface px-4 text-sm text-muted-foreground/70"
              >
                Ask anything...
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-xl font-semibold">Learning tools, one tap away</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["🎓", "Tutor Mode"],
              ["📝", "Quiz"],
              ["📚", "Flashcards"],
              ["📅", "Study Plan"],
              ["📸", "Solve from Image"],
              ["📊", "Progress"],
            ].map(([icon, label]) => (
              <Link
                key={label}
                to="/tools"
                className="flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-surface p-4 text-center transition-colors hover:border-brand/40"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-lg">
                  {icon}
                </span>
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="mb-4 text-3xl font-bold">Simple Plans</h2>
            <p className="text-muted-foreground">Choose the Lyric experience that fits you.</p>
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
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.blurb}</p>
                  </div>
                  <span className="text-xl font-bold">{plan.price}</span>
                </div>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Link
                  to="/pricing"
                  className={cn(
                    "block w-full rounded-xl py-3 text-center text-sm font-semibold",
                    plan.highlighted
                      ? "bg-brand text-brand-foreground"
                      : "border border-hairline text-foreground",
                  )}
                >
                  See plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-2xl font-semibold">Frequently asked</h2>
          <div className="divide-y divide-border overflow-hidden rounded-3xl border border-hairline bg-surface">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group px-6 py-5">
                <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
