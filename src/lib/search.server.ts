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
  /** Hard cap so a slow/unreachable Tavily can never hang the chat. */
  timeoutMs?: number;
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
    throw new Error("TAVILY_API_KEY is not configured on the server.");
  }

  const timeoutMs = options.timeoutMs ?? 12_000;
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
        search_depth: options.searchDepth ?? "basic",
        max_results: Math.max(1, Math.min(options.maxResults ?? 5, 20)),
        include_answer: false,
        include_images: false,
        include_raw_content: false,
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


export function formatSearchResultsForModel(results: TavilySearchResult[]): string {
  if (!results || results.length === 0) {
    return "No recent web search results were found for this query.";
  }
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");
}
