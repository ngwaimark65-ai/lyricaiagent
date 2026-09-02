import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Human-friendly label for a bare URL: forbes.com/... -> forbes.com */
function urlLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

/**
 * Renders assistant Markdown safely.
 * react-markdown does not render raw HTML unless rehype-raw is added, so
 * arbitrary HTML/scripts in model output are escaped as plain text.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h1 className="mt-4 text-lg font-semibold text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 text-base font-semibold text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-sm font-semibold text-foreground">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="ml-5 list-disc space-y-1 marker:text-muted-foreground">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-5 list-decimal space-y-1 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-hairline pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => {
            const url = href ?? "";
            const isBare =
              typeof children === "string" ||
              (Array.isArray(children) && children.length === 1 && children[0] === url);
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                {isBare && children === url ? urlLabel(url) : children}
              </a>
            );
          },
          code: ({ className: c, children }) => {
            const isBlock = /language-/.test(c ?? "");
            if (isBlock) {
              return (
                <code className="block font-mono text-xs leading-relaxed">{children}</code>
              );
            }
            return (
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-hairline bg-surface p-3">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-hairline bg-surface px-2 py-1.5 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-hairline px-2 py-1.5 align-top">{children}</td>
          ),
          hr: () => <hr className="border-hairline" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
