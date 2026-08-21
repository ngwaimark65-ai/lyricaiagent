import { Link } from "@tanstack/react-router";
import { LyricLogo } from "./logo";

export function SiteHeader() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-hairline bg-background/80 px-6 py-4 backdrop-blur-md">
      <LyricLogo />
      <div className="flex items-center gap-4">
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Login
        </Link>
        <Link
          to="/chat"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
        >
          Try Lyric
        </Link>
      </div>
    </nav>
  );
}
