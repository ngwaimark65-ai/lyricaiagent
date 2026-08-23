import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type Body = {
  messages?: ChatMessage[];
  preferences?: {
    gradeYear?: string;
    goals?: string;
    explanationStyle?: string;
    language?: string;
  };
};

function systemPrompt(prefs: Body["preferences"]) {
  const lines = [
    "You are Lyric, a general-purpose AI assistant. Your tagline is \"One AI. Everything you need.\"",
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
              { role: "system", content: systemPrompt(body.preferences) },
              ...messages.slice(-20),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
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
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n");
            buffer = parts.pop() ?? "";
            for (const line of parts) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
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
