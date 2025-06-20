"use client";

import { useEffect, useRef } from "react";
import { useChat, Message } from "@ai-sdk/react";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useChatInteraction } from "../hooks/useChatInteraction";
import { useInputControls } from "../hooks/useInputControls";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { createIdGenerator } from "ai";
import { languageLearningData } from "../dashboard/menu-data/languageLearningData";
import type { ChatData, ChatSettings } from "../tools/chat-store";
import Switch from "react-switch";

const defaultChatSettings: ChatSettings = {
  nativeLanguage: "English",
  selectedLanguage: "Spanish",
  selectedLanguageLabel: "Spanish",
  selectedLevel: "Novice",
  interlocutor: "Mateo",
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
    error: chatError,
    isLoading,
  } = useChat({
    id,
    initialMessages,
    sendExtraMessageFields: true,
    generateId: createIdGenerator({
      prefix: "msgc",
      size: 16,
    }),
    experimental_prepareRequestBody({ messages, id }) {
      return { message: messages[messages.length - 1], id };
    },
  });

  const dotLottiePlayerRef = useRef<DotLottie>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
    isTranscribing,
    transcriptionHookError,
  } = useChatInteraction({ append });

  const {
    pushToTalk,
    setPushToTalk,
    isMobile,
    handleMicInteractionStart,
    handleMicInteractionEnd,
    handleMicClick,
  } = useInputControls({
    isRecording,
    isTranscribing,
    status,
    startRecording,
    stopRecording,
  });

  useTextToSpeech({ messages, isLoading, voice: "coral" });

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

  const renderMessageContent = (content: Message['content']) => {
    if (typeof content === 'string') {
      try {
        if (content.startsWith('[') && content.endsWith(']')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed[0]?.type === 'text') {
            return parsed.map(p => p.text).join('');
          }
        }
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  const errorMessageStyling =
    "fixed bottom-32 left-1/2 transform -translate-x-1/2 p-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg shadow-lg";
  const micCaptionStyling = "text-md text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto h-screen bg-white dark:bg-black">
      <div
        ref={messagesContainerRef}
        className="flex-grow overflow-y-auto w-full px-4"
      >
        <div className="relative h-full mt-4">
          {messages.length > 0 ? (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col my-2 ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-md break-words shadow-md whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-sky-400 dark:bg-sky-900 text-white"
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
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full flex-col justify-between py-8 text-center text-gray-600 dark:text-gray-400">
              <div>
                <p className="text-2xl">Instructions:</p>
                <p className="text-l mt-3">
                  Begin speaking {settings?.selectedLanguageLabel}.{" "}
                  {settings.interlocutor} will have you speaking fluidly about
                  your day, your interests, or anything else you'd like in no
                  time!
                </p>
              </div>
              <div className="text-md pb-4">
                <p>1. Press the button and speak to start chatting.</p>
                <p>2. Press the button again to end transmission.</p>
                <p>3. Await response from {settings?.interlocutor}.</p>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

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
      <div className="relative flex items-center justify-center p-2 bg-white dark:bg-black border-t border-gray-300 dark:border-zinc-800">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <Switch
            id="push-to-talk-toggle"
            checked={pushToTalk}
            onChange={() => setPushToTalk(!pushToTalk)}
            checkedIcon={false}
            uncheckedIcon={false}
            onColor="#2196F3"
            height={20}
            width={40}
          />
          <label
            htmlFor="push-to-talk-toggle"
            className="mt-1 text-xs text-center text-gray-900 dark:text-gray-300 w-24 whitespace-normal"
          >
            {isMobile
              ? pushToTalk
                ? "Hold Mic to Talk"
                : "Tap Mic to Toggle"
              : pushToTalk
              ? "Hold Shift+Z to Talk"
              : "Toggle Shift+Z"}
          </label>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div
            onMouseDown={handleMicInteractionStart}
            onMouseUp={handleMicInteractionEnd}
            onTouchStart={handleMicInteractionStart}
            onTouchEnd={handleMicInteractionEnd}
            onClick={handleMicClick}
            role="button"
            tabIndex={0}
            aria-pressed={isRecording}
            className={`${ 
              isTranscribing || status === "submitted"
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <DotLottieReact
              dotLottieRefCallback={(playerInstance) => {
                dotLottiePlayerRef.current = playerInstance;
              }}
              src="/microphonebutton.json"
              loop={true}
              autoplay={false}
              className={`w-25 h-25 pointer-events-none ${
                isTranscribing || status === "submitted" ? "opacity-50" : ""
              }`}
            />
          </div>
          {status == "submitted" ? (
            <p className={micCaptionStyling}>Processing Speech</p>
          ) : isRecording ? (
            <p className={micCaptionStyling}>Recording</p>
          ) : (
            <p className={micCaptionStyling}>Press to Record</p>
          )}
        </div>
      </div>
    </div>
  );
}
