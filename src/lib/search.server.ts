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
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
}

export async function searchTavily(options: TavilySearchOptions): Promise<TavilySearchResponse> {
  const apiKey = process.env["TAVILY_API_KEY"];
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: options.query,
      search_depth: options.searchDepth ?? "basic",
      max_results: Math.max(1, Math.min(options.maxResults ?? 5, 20)),
      include_answer: false,
      include_images: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Tavily search failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const data = (await response.json()) as TavilySearchResponse;
  return data;
}

export function formatSearchResultsForModel(results: TavilySearchResult[]): string {
  if (!results || results.length === 0) {
    return "No recent web search results were found for this query.";
  }
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");
}
