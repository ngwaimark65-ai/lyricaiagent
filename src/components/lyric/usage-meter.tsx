import { useLyricStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function UsageMeter({ className, compact }: { className?: string; compact?: boolean }) {
  const usage = useLyricStore((s) => s.usage);
  const remaining = Math.max(0, usage.allowance - usage.used);
  const pct = Math.round((remaining / usage.allowance) * 100);

  return (
    <div
      className={cn(
        "rounded-3xl border border-hairline bg-surface p-5",
        compact && "rounded-2xl p-4",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">AI usage remaining</span>
        <span className="text-sm font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        {remaining} of {usage.allowance} credits · {usage.resetsAt}
      </p>
    </div>
  );
}
