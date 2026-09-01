/**
 * Server-only Tavily Search client.
 *
 * TAVILY_API_KEY is read inside the request handler so it is never bundled
 * or exposed to the browser.
 */

const TAVILY_API_URL = "https://api.tavily.com/search";

export interface TavilySearchOptions {
  query: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  /** Ask Tavily for full page content, not just the snippet. */
  includeRawContent?: boolean;
  /** Restrict to authoritative domains for the topic, when known. */
  includeDomains?: string[];
  /** Hard cap so a slow/unreachable Tavily can never hang the chat. */
  timeoutMs?: number;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string | null;
  raw_content?: string | null;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
}

export async function searchTavily(options: TavilySearchOptions): Promise<TavilySearchResponse> {
  const apiKey = process.env["TAVILY_API_KEY"];
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured on the server.");
  }

  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        query: options.query,
        search_depth: options.searchDepth ?? "advanced",
        max_results: Math.max(1, Math.min(options.maxResults ?? 8, 20)),
        include_answer: false,
        include_images: false,
        include_raw_content: options.includeRawContent ?? false,
        ...(options.includeDomains?.length ? { include_domains: options.includeDomains } : {}),
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Tavily search timed out after ${timeoutMs}ms.`);
    }
    throw new Error(
      `Tavily search request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Tavily search failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const data = (await response.json()) as TavilySearchResponse;
  return data;
}

/** Domains we treat as authoritative, by broad topic. */
const AUTHORITATIVE_DOMAINS = [
  "forbes.com",
  "bloomberg.com",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "ft.com",
  "wsj.com",
  "cnbc.com",
  "sec.gov",
  "coindesk.com",
  "coinmarketcap.com",
  "coingecko.com",
  "espn.com",
  "nytimes.com",
  "theguardian.com",
];

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Human-friendly source label, e.g. "Forbes" from forbes.com. */
export function sourceNameOf(url: string): string {
  const host = domainOf(url);
  const core = host.split(".")[0] ?? host;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

function isAuthoritative(url: string): boolean {
  const host = domainOf(url);
  return AUTHORITATIVE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Authoritative sources first, then by Tavily relevance score. */
export function rankResults(results: TavilySearchResult[]): TavilySearchResult[] {
  return [...(results ?? [])].sort((a, b) => {
    const authA = isAuthoritative(a.url) ? 1 : 0;
    const authB = isAuthoritative(b.url) ? 1 : 0;
    if (authA !== authB) return authB - authA;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

/**
 * Full context block for the model: title, source name, domain, URL,
 * publication date and the richest content the API returned.
 */
export function formatSearchResultsForModel(results: TavilySearchResult[]): string {
  if (!results || results.length === 0) {
    return "No recent web search results were found for this query.";
  }
  return rankResults(results)
    .map((r, i) => {
      const body = (r.raw_content && r.raw_content.length > (r.content?.length ?? 0)
        ? r.raw_content
        : r.content ?? ""
      ).slice(0, 6000);
      return [
        `SOURCE ${i + 1}`,
        `Source name: ${sourceNameOf(r.url)}`,
        `Domain: ${domainOf(r.url)}`,
        `Title: ${r.title}`,
        `URL: ${r.url}`,
        `Published: ${r.published_date ?? "unknown"}`,
        `Authoritative: ${isAuthoritative(r.url) ? "yes" : "no"}`,
        `Content:\n${body}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}
