"use client";

import { useEffect, useRef } from "react";
import { useChat, Message } from "@ai-sdk/react";
import UseAudioRecorder from "../hooks/useRecorder";
import { useTranscription } from "../hooks/useTranscription";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { createIdGenerator } from "ai";
import { languageLearningData } from "../dashboard/menu-data/languageLearningData";
import type { ChatData, ChatSettings } from "../tools/chat-store";

const defaultChatSettings: ChatSettings = {
  nativeLanguage: "English", // Example default, adjust as needed
  selectedLanguage: "Spanish", // Example default, adjust as needed
  selectedLevel: "Novice", // Example default, adjust as needed
  interlocutor: "Mateo", // Example default, adjust as needed
  name: "User",
};

const defaultChatObject: ChatData = {
  settings: defaultChatSettings,
  messages: [],
};

export default function Chat({
  id,
  chatObject = defaultChatObject,
}: {
  id?: string | undefined;
  chatObject?: ChatData;
}) {
  const { messages: initialMessages, settings } = chatObject;

  const {
    messages,
    append,
    status,
    stop,
    error: chatError,
  } = useChat({
    id, // use the provided chat ID
    initialMessages: initialMessages, // initial messages if provided
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
    const micCaptionStyling = "text-md text-gray-600 dark:text-gray-400 mb-1";
    const submissionRef = useRef(false);
    const dotLottiePlayerRef = useRef<DotLottie | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const interlocutor = settings?.interlocutor;
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

    useEffect(() => {
      if (endOfMessagesRef.current) {
        endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, [messages]);

    return (
      <div className="flex flex-col w-full max-w-xl py-8 mx-auto stretch min-h-screen items-center">
        <div
          ref={messagesContainerRef}
          className="relative max-w-[80%] overflow-y-auto pb-32"
        >
          {messages.length > 0 ? (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                } space-y-1`}
              >
                <div
                  className={`relative max-w-[85%] rounded-3xl p-4 text-md break-words shadow-md whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-sky-400 dark:bg-sky-900"
                      : "bg-gray-200 dark:bg-gray-800"
                  }`}
                  style={{
                    direction: languageLearningData.find(
                      (lang) =>
                        lang.label === settings?.selectedLanguage ||
                        lang.value === settings?.nativeLanguage
                    )?.rtl
                      ? "rtl"
                      : "ltr",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-lg text-gray-600 dark:text-gray-400 flex flex-col justify-center items-center">
              <p>1. Press the button and speak to start the chat.</p>{" "}
              <br className="mb-3"></br>
              <p>2. Press the button again to end transmission.</p>
              <br className="mb-3"></br>
              <p>3. Await response from {interlocutor}.</p>{" "}
              <br className="mb-3"></br>
            </div>
          )}
          <div ref={endOfMessagesRef} />
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

        <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
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
            className={`w-25 h-25 ${
              isTranscribing || status == "submitted"
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          />
          {isRecording ? (
            <p className={micCaptionStyling}>Recording</p>
          ) : (
            <p className={micCaptionStyling}>Press to Record</p>
          )}
        </div>
      </div>
    );
  }
}
