import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquarePlus, Camera, GraduationCap, ListChecks } from "lucide-react";
import { AppShell } from "@/components/lyric/app-shell";
import { UsageMeter } from "@/components/lyric/usage-meter";
import { useConversations, useLyricStore } from "@/lib/store";
import { SUBJECT_LABEL } from "@/lib/education";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Lyric dashboard" },
      {
        name: "description",
        content:
          "Recent conversations, study progress, suggested quizzes and remaining AI usage in one place.",
      },
      { property: "og:title", content: "Your Lyric dashboard" },
      {
        property: "og:description",
        content: "Pick up where you left off and keep learning with Lyric.",
      },
    ],
  }),
  component: DashboardPage,
});

const QUICK_ACTIONS = [
  { icon: MessageSquarePlus, label: "New conversation", to: "/chat" as const },
  { icon: Camera, label: "Solve from image", to: "/tools" as const },
  { icon: GraduationCap, label: "Tutor mode", to: "/tools" as const },
  { icon: ListChecks, label: "Take a quiz", to: "/tools" as const },
];

function DashboardPage() {
  const conversations = useConversations();
  const profile = useLyricStore((s) => s.profile);
  const recent = conversations.slice(0, 4);
  const learning = conversations.filter((c) => c.educational).slice(0, 3);

  return (
    <AppShell
      title={profile.displayName ? `Welcome back, ${profile.displayName}` : "Welcome to Lyric"}
      subtitle="One AI. Everything you need."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-3xl border border-hairline bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Recent conversations</h2>
            {recent.length === 0 ? (
              <EmptyRow
                text="No conversations yet."
                cta="Start chatting"
                to="/chat"
              />
            ) : (
              <ul className="space-y-1">
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/chat/$conversationId"
                      params={{ conversationId: c.id }}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <span className="truncate">{c.title}</span>
                      {c.subject && (
                        <span className="ml-3 shrink-0 rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-brand">
                          {SUBJECT_LABEL[c.subject]}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-hairline bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Continue learning</h2>
            {learning.length === 0 ? (
              <EmptyRow
                text="Lyric will list your study topics here once you start asking educational questions."
                cta="Ask something"
                to="/chat"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {learning.map((c) => (
                  <Link
                    key={c.id}
                    to="/chat/$conversationId"
                    params={{ conversationId: c.id }}
                    className="rounded-2xl border border-hairline bg-background p-4 transition-colors hover:border-brand/40"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand">
                      {c.subject ? SUBJECT_LABEL[c.subject] : "General"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-hairline bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Study progress</h2>
            <p className="text-xs text-muted-foreground">
              Mastery charts appear once quiz history is saved to your account. Nothing is estimated
              before then.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Quizzes taken", "Topics covered", "Average score"].map((label) => (
                <div key={label} className="rounded-2xl border border-hairline bg-background p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono text-lg">—</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <UsageMeter />

          <section className="rounded-3xl border border-brand/30 bg-brand/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand">
              Suggested quiz
            </p>
            <p className="mt-2 text-sm">
              {learning[0]
                ? `Test yourself on ${learning[0].subject ? SUBJECT_LABEL[learning[0].subject] : "your recent topic"}.`
                : "Study a topic in chat and Lyric will suggest a quiz here."}
            </p>
            <Link
              to="/tools"
              className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
            >
              Open quizzes
            </Link>
          </section>

          <section className="rounded-3xl border border-hairline bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ icon: Icon, label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-background p-4 text-center transition-colors hover:border-brand/40"
                >
                  <Icon className="size-5 text-brand" />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyRow({ text, cta, to }: { text: string; cta: string; to: "/chat" }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline p-6 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
      <Link
        to={to}
        className="mt-3 inline-flex rounded-lg bg-surface-2 px-4 py-2 text-xs font-semibold"
      >
        {cta}
      </Link>
    </div>
  );
}
