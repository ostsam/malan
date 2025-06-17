"use client";

import { useChat } from "@ai-sdk/react";
import { CircleLoader } from "react-spinners";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status, stop } =
    useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
            }
          })}
        </div>
      ))}
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
