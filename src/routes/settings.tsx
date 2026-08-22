import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/lyric/app-shell";
import { actions, useLyricStore } from "@/lib/store";
import { SUBJECT_LABEL } from "@/lib/education";
import type { ExplanationStyle, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Lyric profile and learning preferences" },
      {
        name: "description",
        content:
          "Set your grade, subjects, learning goals, preferred explanation style and language so Lyric can personalise tutoring.",
      },
      { property: "og:title", content: "Lyric profile and learning preferences" },
      {
        property: "og:description",
        content: "Personalise how Lyric explains things to you.",
      },
    ],
  }),
  component: SettingsPage,
});

const STYLES: { id: ExplanationStyle; label: string; hint: string }[] = [
  { id: "concise", label: "Concise", hint: "Straight to the answer" },
  { id: "step-by-step", label: "Step by step", hint: "Worked through in order" },
  { id: "socratic", label: "Socratic", hint: "Guided with questions" },
  { id: "analogies", label: "Analogies", hint: "Explained through comparisons" },
];

const SUBJECTS = Object.keys(SUBJECT_LABEL) as Subject[];

function SettingsPage() {
  const profile = useLyricStore((s) => s.profile);
  const prefs = profile.preferences;

  return (
    <AppShell
      title="Profile and personalisation"
      subtitle="Saved locally for now; these fields map to your Lyric profile once accounts are connected."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-hairline bg-surface p-6">
          <h2 className="text-sm font-semibold">Account</h2>
          <Field
            label="Display name"
            value={profile.displayName}
            placeholder="Ada Lovelace"
            onChange={(displayName) => actions.updateProfile({ displayName })}
          />
          <Field
            label="Email"
            value={profile.email}
            placeholder="you@example.com"
            onChange={(email) => actions.updateProfile({ email })}
          />
          <Field
            label="Grade / year"
            value={prefs.gradeYear}
            placeholder="Grade 11"
            onChange={(gradeYear) => actions.updatePreferences({ gradeYear })}
          />
          <Field
            label="Language"
            value={prefs.language}
            placeholder="English"
            onChange={(language) => actions.updatePreferences({ language })}
          />
        </section>

        <section className="space-y-6 rounded-3xl border border-hairline bg-surface p-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Subjects</h2>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((subject) => {
                const active = prefs.subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    onClick={() =>
                      actions.updatePreferences({
                        subjects: active
                          ? prefs.subjects.filter((s) => s !== subject)
                          : [...prefs.subjects, subject],
                      })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-brand bg-brand/15 text-brand"
                        : "border-hairline text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {SUBJECT_LABEL[subject]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Preferred explanation style</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => actions.updatePreferences({ explanationStyle: style.id })}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    prefs.explanationStyle === style.id
                      ? "border-brand bg-brand/10"
                      : "border-hairline hover:border-brand/40",
                  )}
                >
                  <p className="text-xs font-semibold">{style.label}</p>
                  <p className="text-[11px] text-muted-foreground">{style.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-muted-foreground">
              Learning goals
            </span>
            <textarea
              value={prefs.goals}
              onChange={(e) => actions.updatePreferences({ goals: e.target.value })}
              rows={3}
              placeholder="Pass my final exams and get comfortable with calculus."
              className="w-full resize-none rounded-xl border border-hairline bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-brand/60"
            />
          </label>

          <button
            onClick={() => toast("Preferences saved on this device")}
            className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-brand-foreground"
          >
            Save preferences
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-hairline bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-brand/60"
      />
    </label>
  );
}
