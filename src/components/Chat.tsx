"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat({ lessonSlug }: { lessonSlug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessages(msgs: Message[]) {
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, lessonSlug }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message to stream into
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              assistantContent += `\n\n[Error: ${parsed.error}]`;
            } else if (parsed.text) {
              assistantContent += parsed.text;
            }
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
              };
              return updated;
            });
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `[Error: ${message}]` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function handleStart() {
    setStarted(true);
    const initialMessages: Message[] = [
      { role: "user", content: "Please present this lesson and then start practice exercises." },
    ];
    setMessages(initialMessages);
    sendMessages(initialMessages);
  }

  function handleSend(text: string) {
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    sendMessages(newMessages);
  }

  if (!started) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Practice Session</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Start an interactive practice session for this lesson with a tutor
            powered by Claude.
          </p>
          <button
            onClick={handleStart}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Start Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6">
      <h2 className="text-lg font-semibold mb-4">Practice Session</h2>
      <div className="max-h-[60vh] overflow-y-auto mb-4 space-y-1">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
