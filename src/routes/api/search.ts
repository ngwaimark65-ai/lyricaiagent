import { createFileRoute } from "@tanstack/react-router";

import { searchTavily } from "@/lib/search.server";
import { checkQuota, consumeUsage, getUserIdFromRequest } from "@/lib/entitlements.server";

type Body = {
  query?: string;
  maxResults?: number;
};

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const query = typeof body.query === "string" ? body.query.trim() : "";
        if (!query) {
          return new Response("Query is required", { status: 400 });
        }

        const userId = await getUserIdFromRequest(request);
        if (!userId) {
          return new Response("Please sign in to use web search.", { status: 401 });
        }
        const quota = await checkQuota(userId, true);
        if (!quota.allowed) {
          return new Response(quota.message ?? "Daily limit reached.", { status: 429 });
        }
        if (quota.searchBlocked) {
          return new Response(
            `You've used all ${quota.entitlements.searchesLimit} live web searches on your plan for today. Upgrade for a higher search allowance.`,
            { status: 429 },
          );
        }
        await consumeUsage(userId, 0, 1);



        try {
          const result = await searchTavily({
            query,
            maxResults: typeof body.maxResults === "number" ? body.maxResults : 5,
          });
          return Response.json({
            query: result.query,
            results: result.results,
          });
        } catch (error) {
          console.error("Search error:", error);
          const message = error instanceof Error ? error.message : "Search failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
