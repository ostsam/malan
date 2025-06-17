"use client";

import { useChat } from "@ai-sdk/react";
import { CircleLoader } from "react-spinners";
import UseRecorder from "./hooks/useRecorder";

export default function Chat() {
  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
  } = useChat();

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div
            key={message.id}
            className={`flex flex-col ${
              isUser ? "items-end" : "items-start"
            } space-y-1`}
          >
            <div
              className={`relative max-w-[80%] rounded-3xl p-4 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-lg ring-1 ring-white/10 ${
                isUser
                  ? "bg-gradient-to-br from-lime-400 to-lime-500 text-black"
                  : "bg-gradient-to-br from-amber-400 to-amber-500 text-black"
              }`}
            >
              {message.content}
            </div>
          </div>
        );
      })}
      <div className="fixed bottom-18">
        {(status === "submitted" || status === "streaming") && (
          <div>
            {status === "submitted" && (
              <CircleLoader color="#1E88E5" size={25} />
            )}
            <button type="button" onClick={() => stop()}>
              Stop
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
            value={input}
            placeholder="Say something..."
            onChange={handleInputChange}
            disabled={status !== "ready"}
          />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}
