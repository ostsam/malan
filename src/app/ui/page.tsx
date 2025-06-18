"use client";

import { useEffect, useRef } from "react";
import { useChat, Message } from "@ai-sdk/react";
import UseAudioRecorder from "../hooks/useRecorder";
import { useTranscription } from "../hooks/useTranscription";
import { CircleLoader } from "react-spinners";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { createIdGenerator, smoothStream } from "ai";

export default function Chat({
  id,
  initialMessages,
}: { id?: string | undefined; initialMessages?: Message[] } = {}) {
  const {
    messages,
    append,
    status,
    stop,
    error: chatError,
  } = useChat({
    id, // use the provided chat ID
    initialMessages, // initial messages if provided
    sendExtraMessageFields: true, // send id and createdAt for each message
    generateId: createIdGenerator({
      prefix: "msgc",
      size: 16,
    }),
    experimental_prepareRequestBody({ messages, id }) {
      return { message: messages[messages.length - 1], id };
    },
  });
  {
    const errorMessageStyling =
      "fixed bottom-32 left-1/2 transform -translate-x-1/2 p-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg shadow-lg";

    const submissionRef = useRef(false);
    const dotLottiePlayerRef = useRef<DotLottie | null>(null);

    const {
      isRecording,
      audioBlob,
      recordingError,
      startRecording,
      stopRecording,
      clearAudioBlob,
    } = UseAudioRecorder();

    const handleTranscriptionSuccess = (text: string) => {
      append({ role: "user", content: text });
    };

    const {
      isTranscribing,
      transcriptionError: transcriptionHookError,
      submitTranscription,
    } = useTranscription({
      onTranscriptionSuccess: handleTranscriptionSuccess,
    });

    useEffect(() => {
      if (audioBlob && !submissionRef.current) {
        submissionRef.current = true;
        submitTranscription(audioBlob).finally(() => {
          clearAudioBlob();
          submissionRef.current = false; // Reset ref
        });
      }
    }, [audioBlob, submitTranscription, clearAudioBlob]);

    useEffect(() => {
      const player = dotLottiePlayerRef.current;
      if (player) {
        if (isRecording) {
          player.play();
        } else {
          player.stop();
        }
      }
    }, [isRecording]);

    return (
      <div className="flex flex-col w-full max-w-xl py-8 mx-auto stretch min-h-screen items-center">
        <div className="flex-grow w-full overflow-y-auto mb-20">
          {messages.length > 0 ? (
            messages.map((m) => (
              <div
                key={m.id}
                className={`whitespace-pre-wrap p-2 my-2 rounded-lg ${
                  m.role === "user"
                    ? "bg-blue-100 dark:bg-blue-900 self-end"
                    : "bg-gray-100 dark:bg-gray-800 self-start"
                }`}
              >
                <strong>{m.role === "user" ? "You: " : "AI: "}</strong>
                {m.content}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
              Press the record button and speak to start the chat. <br></br>
              Press the button again to end transmission.
            </div>
          )}

          {(isTranscribing || status == "submitted") && (
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-md">
              <CircleLoader color="#1E88E5" size={20} />
              <span>
                {isTranscribing ? "Transcribing..." : "System Processing..."}
              </span>
              {status == "submitted" &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="ml-2 p-1 bg-red-500 text-white rounded text-xs"
                  >
                    Stop
                  </button>
                )}
            </div>
          )}
          {recordingError && (
            <div className={errorMessageStyling}>
              Recording Error: {recordingError}
            </div>
          )}
          {transcriptionHookError && (
            <div className={errorMessageStyling}>
              Transcription Error: {transcriptionHookError}
            </div>
          )}
          {chatError && (
            <div className={errorMessageStyling}>
              Chat Error: {chatError.message}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
          <DotLottieReact
            dotLottieRefCallback={(playerInstance) => {
              dotLottiePlayerRef.current = playerInstance;
            }}
            src="/microphonebutton.json"
            loop={true}
            autoplay={false}
            onClick={() => {
              if (!(isTranscribing || status == "submitted")) {
                isRecording ? stopRecording() : startRecording();
              }
            }}
            className={`w-30 h-30 ${
              isTranscribing || status == "submitted"
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          />
        </div>
      </div>
    );
  }
}
