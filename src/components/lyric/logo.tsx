import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LyricMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 place-items-center rounded-lg bg-brand-gradient shadow-brand-glow",
        className,
      )}
      aria-hidden
    >
      <span className="size-2 rotate-45 rounded-[2px] bg-background" />
    </span>
  );
}

export function LyricLogo({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2", className)}>
      <LyricMark />
      <span className="text-xl font-semibold tracking-tighter text-foreground">lyric</span>
    </Link>
  );
}
