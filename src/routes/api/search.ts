import { createFileRoute } from "@tanstack/react-router";

import { searchTavily } from "@/lib/search.server";

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
