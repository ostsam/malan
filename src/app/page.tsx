"use client";

import { useChat } from "@ai-sdk/react";
import { CircleLoader } from "react-spinners";
import UseRecorder from "./hooks/useRecorder";
import { useTranscription } from "./hooks/useTranscription";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
    <div className="flex flex-col w-full max-w-md py-5 mx-auto stretch">
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
              className={`relative max-w-[85%] mb-1.75 rounded-lg p-3 text-med ${
                isUser
                  ? "bg-gradient-to-br from-sky-500 to-sky-600 text-black"
                  : "bg-gradient-to-bl from-lime-600 to-lime-500 text-black"
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
          <DotLottieReact src="src/microphonebutton.json" loop autoplay />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}
