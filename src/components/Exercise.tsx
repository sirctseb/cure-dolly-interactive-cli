"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Phase =
  | "idle"
  | "loading-prompt"
  | "prompting"
  | "loading-feedback"
  | "feedback";

async function streamResponse(
  messages: Message[],
  lessonSlug: string,
  onText: (text: string) => void,
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, lessonSlug }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) {
          full += parsed.text;
          onText(full);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== "Unknown error") throw e;
      }
    }
  }

  return full;
}

export function Exercise({ lessonSlug }: { lessonSlug: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [history, setHistory] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "prompting") {
      inputRef.current?.focus();
    }
  }, [phase]);

  async function fetchExercise(currentHistory: Message[]) {
    setPhase("loading-prompt");
    setPrompt("");
    setFeedback("");
    setUserAnswer("");
    setError(null);

    const msgs: Message[] = [
      ...currentHistory,
      { role: "user", content: "next" },
    ];

    try {
      const result = await streamResponse(msgs, lessonSlug, setPrompt);
      const updatedHistory: Message[] = [
        ...msgs,
        { role: "assistant", content: result },
      ];
      setHistory(updatedHistory);
      setPrompt(result.trim());
      setPhase("prompting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function submitAnswer() {
    const answer = inputValue.trim();
    if (!answer) return;

    setUserAnswer(answer);
    setInputValue("");
    setPhase("loading-feedback");
    setFeedback("");

    const msgs: Message[] = [...history, { role: "user", content: answer }];

    try {
      const result = await streamResponse(msgs, lessonSlug, setFeedback);
      const updatedHistory: Message[] = [
        ...msgs,
        { role: "assistant", content: result },
      ];
      setHistory(updatedHistory);
      setFeedback(result.trim());
      setPhase("feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("feedback");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitAnswer();
    }
  }

  if (phase === "idle") {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Practice</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Translate English to Japanese using the grammar from this lesson.
          </p>
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">
              {error}
            </p>
          )}
          <button
            onClick={() => fetchExercise(history)}
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
      <h2 className="text-lg font-semibold mb-4">Practice</h2>

      <div className="space-y-4">
        {/* Exercise prompt */}
        <div className="text-xl font-medium text-gray-900 dark:text-gray-100">
          {prompt || <span className="text-gray-400">Loading...</span>}
        </div>

        {/* User answer (shown after submission) */}
        {userAnswer && (
          <div className="text-lg text-gray-700 dark:text-gray-300">
            {userAnswer}
          </div>
        )}

        {/* Feedback */}
        {(phase === "loading-feedback" || phase === "feedback") && (
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {feedback || <span className="text-gray-400">...</span>}
          </div>
        )}

        {/* Input (shown during prompting phase) */}
        {phase === "prompting" && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type Japanese here..."
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={submitAnswer}
              disabled={!inputValue.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        )}

        {/* Next button (shown after feedback) */}
        {phase === "feedback" && (
          <button
            onClick={() => fetchExercise(history)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Next
          </button>
        )}

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
