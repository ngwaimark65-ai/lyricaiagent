import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tighter">lyric</span>
          <div className="flex gap-4">
            <span className="size-8 rounded-full bg-surface-2" />
            <span className="size-8 rounded-full bg-surface-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="text-foreground">Product</p>
            <Link to="/chat" className="block hover:text-foreground">
              Chat
            </Link>
            <Link to="/tools" className="block hover:text-foreground">
              Tutoring
            </Link>
            <Link to="/pricing" className="block hover:text-foreground">
              Pricing
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-foreground">Company</p>
            <span className="block">Privacy</span>
            <span className="block">Terms</span>
          </div>
        </div>
        <p className="mt-12 font-mono text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} Lyric AI Technologies Inc.
        </p>
      </div>
    </footer>
  );
}
