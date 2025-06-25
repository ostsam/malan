"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChat, Message } from "@ai-sdk/react";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useChatInteraction } from "../hooks/useChatInteraction";
import { useInputControls } from "../hooks/useInputControls";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { EditIcon } from 'lucide-react';
import { getChat, updateChatSlug } from '../actions/chat';
import { createIdGenerator } from "ai";
import { languageLearningData } from "../dashboard/menu-data/languageLearningData";
import type { ChatData, ChatSettings } from "../tools/chat-store";

// Define a version of ChatData where dates are strings for serialization
interface SerializableChatData extends Omit<ChatData, 'messages' | 'createdAt'> {
  messages: Array<Omit<Message, 'createdAt'> & { createdAt?: string }>;
  createdAt?: string;
}
import Switch from "react-switch";

const defaultChatSettings: ChatSettings = {
  nativeLanguage: "en",
  nativeLanguageLabel: "English",
  selectedLanguage: "es",
  selectedLanguageLabel: "Spanish",
  selectedLevel: "Novice",
  interlocutor: "Mateo",
  name: "User",
};

const defaultChatObject: SerializableChatData = {
  settings: defaultChatSettings,
  messages: [],
};

export default function Chat({
  slug: initialSlug,

  id,
  chatObject = defaultChatObject,
}: {
  slug?: string;
  id?: string | undefined;
  chatObject?: SerializableChatData;
}) {
  const [slug, setSlug] = useState(initialSlug || 'New Chat');
  const { messages: serializableMessages, settings } = chatObject;

  // Deserialize messages before passing them to the useChat hook
  const initialMessages: Message[] = serializableMessages.map((message) => ({
    ...message,
    createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
  }));

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

  const { stopAudioPlayback } = useTextToSpeech({
    messages,
    isLoading,
    voice: "coral",
  });

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
    stopAudioPlayback,
  });

  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const hasOverflow = container.scrollHeight > container.clientHeight;
      setIsOverflowing(hasOverflow);
    }
  }, [messages]);

    useEffect(() => {
    if (id) {
      getChat(id).then(chat => {
        if (chat?.slug) {
          setSlug(chat.slug);
        }
      });
    }
  }, [id]);

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

  const renderMessageContent = (content: Message["content"]) => {
    if (typeof content === "string") {
      try {
        if (content.startsWith("[") && content.endsWith("]")) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed[0]?.type === "text") {
            return parsed.map((p) => p.text).join("");
          }
        }
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  const errorMessageStyling =
    "fixed bottom-40 left-1/2 transform -translate-x-1/2 p-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg shadow-lg z-10";
  const micCaptionStyling = "text-md text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto h-screen bg-white dark:bg-black overflow-hidden">
      <div className="flex justify-center">
        <div className="text-center">
        <a href="/">
          <img
            src="/logo.svg"
            alt="Malan Logo"
            className="h-16 w-auto inline-block"
          />
        </a>
        <div className="relative mt-2 flex flex-col">
          <h2 className="text-lg text-center font-semibold text-gray-700 dark:text-gray-300 break-words px-8">
            {slug}
          </h2> <br />
          <button 
            onClick={async () => {
              const newSlug = prompt('Enter new chat title:', slug);
              if (id && newSlug) {
                await updateChatSlug(id, newSlug);
                setSlug(newSlug);
              }
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
          >
            <EditIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      </div>
      <div
        ref={messagesContainerRef}
        className={`flex-grow w-full pt-4 px-4 pb-4 ${
          isOverflowing ? "overflow-y-auto" : "overflow-y-hidden"
        }`}
      >
        <div className="relative h-full">
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
                  Begin speaking {settings.selectedLanguageLabel}.{" "}
                  {settings.interlocutor} will have you speaking fluidly about
                  your day, your interests, or anything else you'd like in no
                  time!
                </p>
              </div>
              <div className="text-md pb-4">
                <p>1. Press the button and speak to begin</p>
                <p>2. Release it to end the transmission.</p>
                <p>3. Await response from {settings.interlocutor}.</p>
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
      <div className="relative flex items-center justify-center bg-white dark:bg-black border-t border-gray-300 dark:border-zinc-800">
        <div className="absolute left-1 flex flex-col items-center">
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
