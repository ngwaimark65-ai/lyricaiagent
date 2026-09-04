import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/lyric/chat-view";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Lyric Chat — ask anything, learn anything" },
      {
        name: "description",
        content:
          "Chat with Lyric about everyday questions, work and study. Tutoring, quizzes and image questions are built in.",
      },
      { property: "og:title", content: "Lyric Chat — ask anything, learn anything" },
      {
        property: "og:description",
        content: "A general AI assistant with education intelligence built in.",
      },
    ],
  }),
  component: () => <ChatView conversationId={null} />,
});
