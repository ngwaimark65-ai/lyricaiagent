import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/lyric/chat-view";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  head: () => ({
    meta: [
      { title: "Lyric Chat — your conversation" },
      {
        name: "description",
        content:
          "Continue your saved Lyric conversation, with tutoring, quizzes and live web answers built in.",
      },
      { property: "og:title", content: "Lyric Chat — your conversation" },
      {
        property: "og:description",
        content: "Pick up any saved Lyric conversation right where you left off.",
      },
    ],
  }),
  component: ChatThread,
});

function ChatThread() {
  const { conversationId } = Route.useParams();
  // Keyed by thread id so message state can never bleed between conversations.
  return <ChatView key={conversationId} conversationId={conversationId} />;
}
