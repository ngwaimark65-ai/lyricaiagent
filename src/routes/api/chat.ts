import { createFileRoute } from "@tanstack/react-router";

import { formatSearchResultsForModel, searchTavily } from "@/lib/search.server";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type Body = {
  messages?: ChatMessage[];
  preferences?: {
    gradeYear?: string;
    goals?: string;
    explanationStyle?: string;
    language?: string;
  };
  useSearch?: boolean;
};

function systemPrompt(prefs: Body["preferences"], searchContext?: string) {
  const lines = [
    'You are Lyric, a general-purpose AI assistant. Your tagline is "One AI. Everything you need."',
    "You are conversational, intelligent, helpful and friendly.",
    "You answer everyday, professional and educational questions equally well.",
    "Explain concepts clearly, using structure and short examples where useful.",
    "When a question is vague or a user is learning, ask one useful follow-up question.",
    "Be concise by default; expand when the topic needs it. Use markdown-free plain prose unless lists genuinely help.",
    "Never invent facts. If unsure, say so.",
  ];
  if (prefs?.gradeYear) lines.push(`The user's grade/year level: ${prefs.gradeYear}.`);
  if (prefs?.goals) lines.push(`The user's learning goals: ${prefs.goals}.`);
  if (prefs?.explanationStyle)
    lines.push(`Preferred explanation style: ${prefs.explanationStyle}.`);
  if (prefs?.language) lines.push(`Reply in ${prefs.language}.`);

  if (searchContext) {
    lines.push(
      "",
      "The user's question may require current information. Use the following recent web search results to help answer. Cite sources by number [1], [2], etc. when you use them. If the results do not answer the question, rely on your own knowledge and say so.",
      "",
      searchContext,
    );
  }

  return lines.join("\n");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("AI is not configured.", { status: 500 });
        }

        let searchContext: string | undefined;
        let searchError: string | undefined;
        if (body.useSearch) {
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          if (lastUser?.content) {
            const startedAt = Date.now();
            try {
              const search = await searchTavily({
                query: lastUser.content,
                maxResults: 5,
                searchDepth: "basic",
                timeoutMs: 12_000,
              });
              searchContext = formatSearchResultsForModel(search.results);
              console.log(
                `[chat] tavily ok: ${search.results?.length ?? 0} results in ${Date.now() - startedAt}ms`,
              );
            } catch (error) {
              // Never log the key — searchTavily only ever surfaces status + body text.
              searchError =
                error instanceof Error ? error.message : "Unknown web search failure";
              console.error(
                `[chat] tavily failed after ${Date.now() - startedAt}ms: ${searchError}`,
              );
            }
          }
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3.7-flash",
            stream: true,
            messages: [
              {
                role: "system",
                content: systemPrompt(body.preferences, searchContext, searchError),
              },
              ...messages.slice(-20),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error(`[chat] gateway error ${upstream.status}: ${detail.slice(0, 300)}`);
          const message =
            upstream.status === 429
              ? "Lyric is receiving too many requests right now. Please try again in a moment."
              : upstream.status === 402
                ? "AI credits are exhausted. Please add credits to continue."
                : `Lyric couldn't reach the AI model (${upstream.status}). ${detail.slice(0, 200)}`;
          return new Response(message, { status: upstream.status || 500 });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const reader = upstream.body.getReader();

        // A pump loop in start() (instead of pull()) guarantees we keep draining the
        // upstream SSE body and always close the stream — the previous pull-based
        // version could leave the response open after the model finished.
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let buffer = "";
            const flush = (chunk: string) => {
              buffer += chunk;
              const parts = buffer.split("\n");
              buffer = parts.pop() ?? "";
              for (const line of parts) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const data = trimmed.slice(5).trim();
                if (!data) continue;
                if (data === "[DONE]") return true;
                try {
                  const json = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  const text = json.choices?.[0]?.delta?.content;
                  if (text) controller.enqueue(encoder.encode(text));
                } catch {
                  /* ignore partial frames */
                }
              }
              return false;
            };

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (flush(decoder.decode(value, { stream: true }))) break;
              }
            } catch (error) {
              console.error(
                `[chat] stream error: ${error instanceof Error ? error.message : String(error)}`,
              );
            } finally {
              await reader.cancel().catch(() => {});
              controller.close();
            }
          },
          cancel(reason) {
            return reader.cancel(reason);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });

      },
    },
  },
});
