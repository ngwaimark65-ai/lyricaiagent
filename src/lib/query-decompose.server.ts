/**
 * Server-only decomposition of a multi-part current-information question into
 * separate, self-contained search queries.
 *
 * Strategy: ask a small fast model for a strict JSON list, with a purely
 * heuristic fallback so decomposition never becomes a hard dependency.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MAX_SUBQUERIES = 6;

/** Cheap signal that a question may contain more than one factual request. */
export function looksMultiPart(question: string): boolean {
  const q = question.toLowerCase();
  const connectors = (q.match(/\band\b|,|\bvs\.?\b|\bversus\b|\bcompare\b/g) ?? []).length;
  if (connectors === 0) return false;
  // "and" inside a single entity name ("Johnson and Johnson") is rare enough that
  // one connector plus a list-ish shape is still worth checking.
  return connectors >= 1;
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

/**
 * Heuristic split: "A, B and C" style enumerations inside one question stem.
 * Only used when the model call is unavailable or unusable.
 */
export function heuristicDecompose(question: string): string[] {
  const cleaned = question.trim().replace(/\?+$/, "");
  // Split on list separators, keeping the leading stem for context.
  const parts = cleaned
    .split(/\s*,\s*|\s+\band\b\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return [];

  const stem = parts[0] ?? "";
  const queries = [stem, ...parts.slice(1).map((p) => (p.split(/\s+/).length <= 4 ? `${stem} ${p}` : p))];
  return dedupe(queries).slice(0, MAX_SUBQUERIES);
}

export async function decomposeQuery(
  question: string,
  apiKey: string,
  timeoutMs = 8000,
): Promise<string[]> {
  if (!looksMultiPart(question)) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        stream: false,
        messages: [
          {
            role: "system",
            content: [
              "You split a user question into independent web-search queries.",
              "Return ONLY compact JSON: {\"queries\":[\"...\"]}",
              "Rules:",
              "- If the question asks about exactly ONE fact/entity, return an empty array.",
              "- If it asks about MULTIPLE distinct entities or facts, return one fully self-contained query per part.",
              "- Each query must be understandable alone (repeat the subject, e.g. 'current president of Zambia').",
              `- Maximum ${MAX_SUBQUERIES} queries. No commentary.`,
            ].join("\n"),
          },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) return heuristicDecompose(question);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return heuristicDecompose(question);
    const parsed = JSON.parse(match[0]) as { queries?: unknown };
    const queries = Array.isArray(parsed.queries)
      ? parsed.queries.filter((q): q is string => typeof q === "string" && q.trim().length > 2)
      : [];
    const clean = dedupe(queries).slice(0, MAX_SUBQUERIES);
    return clean.length >= 2 ? clean : [];
  } catch {
    return heuristicDecompose(question);
  } finally {
    clearTimeout(timer);
  }
}
