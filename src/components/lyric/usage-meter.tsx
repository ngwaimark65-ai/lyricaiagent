import { Link } from "@tanstack/react-router";
import { useLyricStore } from "@/lib/store";
import { getPlan } from "@/lib/plan-config";
import { cn } from "@/lib/utils";

function Bar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", remaining === 0 && "text-destructive")}>
          {remaining} / {limit} left
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full transition-all", remaining === 0 ? "bg-destructive" : "bg-brand-gradient")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageMeter({ className, compact }: { className?: string; compact?: boolean }) {
  const usage = useLyricStore((s) => s.usage);
  const plan = useLyricStore((s) => s.subscription.plan);
  const def = getPlan(plan);
  const outOfSomething =
    usage.messagesUsed >= usage.messagesLimit || usage.searchesUsed >= usage.searchesLimit;

  return (
    <div
      className={cn(
        "space-y-3 rounded-3xl border border-hairline bg-surface p-5",
        compact && "rounded-2xl p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Today's usage</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            plan === "free" && "border border-hairline text-muted-foreground",
            plan === "plus" && "bg-brand/15 text-brand",
            plan === "pro" && "bg-brand-gradient text-brand-foreground",
          )}
        >
          {def.name}
        </span>
      </div>
      <Bar label="AI messages" used={usage.messagesUsed} limit={usage.messagesLimit} />
      <Bar label="Web searches" used={usage.searchesUsed} limit={usage.searchesLimit} />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Resets daily · midnight UTC
        </p>
        {plan !== "pro" && (
          <Link
            to="/pricing"
            className={cn(
              "text-xs font-semibold text-brand hover:underline",
              outOfSomething && "animate-pulse",
            )}
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
}
