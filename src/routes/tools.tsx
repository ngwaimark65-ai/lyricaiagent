import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/lyric/app-shell";
import { USAGE_COST, type UsageOperation } from "@/lib/types";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Lyric Education Tools — tutor, quiz, flashcards, study plans" },
      {
        name: "description",
        content:
          "Tutor Mode, quizzes, flashcards, study plans, solve-from-image and progress tracking, built into Lyric.",
      },
      { property: "og:title", content: "Lyric Education Tools" },
      {
        property: "og:description",
        content: "Tutoring, quizzes, flashcards and study plans inside your AI assistant.",
      },
    ],
  }),
  component: ToolsPage,
});

interface Tool {
  icon: string;
  name: string;
  description: string;
  operation: UsageOperation;
  status: "Needs AI model" | "Needs vision model" | "Needs saved history";
}

const TOOLS: Tool[] = [
  {
    icon: "🎓",
    name: "Tutor Mode",
    description: "Step-by-step teaching that checks your understanding as you go.",
    operation: "tutor.session",
    status: "Needs AI model",
  },
  {
    icon: "📝",
    name: "Quiz",
    description: "One question at a time, marked and explained, with a final score.",
    operation: "quiz.generate",
    status: "Needs AI model",
  },
  {
    icon: "📚",
    name: "Flashcards",
    description: "Spaced-repetition decks generated from your conversations.",
    operation: "flashcards.generate",
    status: "Needs AI model",
  },
  {
    icon: "📅",
    name: "Study Plan",
    description: "A weekly schedule built around your exams and weak areas.",
    operation: "studyplan.generate",
    status: "Needs AI model",
  },
  {
    icon: "📸",
    name: "Solve from Image",
    description: "Photograph homework, a textbook page or handwritten work.",
    operation: "vision.solve",
    status: "Needs vision model",
  },
  {
    icon: "📊",
    name: "Progress",
    description: "Track mastery by subject across quizzes and tutoring sessions.",
    operation: "chat.message",
    status: "Needs saved history",
  },
];

function ToolsPage() {
  const [selected, setSelected] = useState<Tool | null>(null);

  return (
    <AppShell title="Education tools" subtitle="Learning features layered on top of normal chat.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.name}
            onClick={() => setSelected(tool)}
            className="group rounded-3xl border border-hairline bg-surface p-5 text-left transition-colors hover:border-brand/40"
          >
            <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand/10 text-xl">
              {tool.icon}
            </div>
            <h2 className="text-sm font-semibold">{tool.name}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {USAGE_COST[tool.operation]} credits · {tool.status}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-hairline bg-surface p-6 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand/10 text-2xl">
              {selected.icon}
            </div>
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
            <div className="mt-6 rounded-2xl border border-dashed border-hairline p-4 text-xs text-muted-foreground">
              This tool's interface is ready. It stays inactive until the backing model is
              connected — no results are simulated.
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  actions.consumeUsage(selected.operation);
                  toast(`${selected.name} isn't connected yet`, {
                    description: selected.status,
                  });
                  setSelected(null);
                }}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground"
              >
                Try it
              </button>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-hairline px-5 py-3 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
