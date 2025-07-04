"use client";

import { useEffect, useRef } from "react";
import { useChat, Message } from "@ai-sdk/react";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useChatInteraction } from "../hooks/useChatInteraction";
import { useInputControls } from "../hooks/useInputControls";
import { type DotLottie } from "@lottiefiles/dotlottie-react";
import { EditIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createIdGenerator } from "ai";
import type { ChatData, ChatSettings } from "../tools/chat-store";
import { interfaceColor } from "@/app/layout";
import { useRTL } from "@/app/hooks/useRTL";
import { useChatSlug } from "@/app/hooks/useChatSlug";
import { useChatMessages } from "@/app/hooks/useChatMessages";
import { useChatTTS } from "@/app/hooks/useChatTTS";
import { useChatErrors } from "@/app/hooks/useChatErrors";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatControls } from "@/components/chat/ChatControls";
import { Virtuoso } from "react-virtuoso";

// Define a version of ChatData where dates are strings for serialization
interface SerializableChatData
  extends Omit<ChatData, "messages" | "createdAt"> {
  messages: Array<Omit<Message, "createdAt"> & { createdAt?: string }>;
  createdAt?: string;
}

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
  const { messages: serializableMessages, settings } = chatObject;

  // Initialize hooks
  const { slug, handleSlugUpdate, generateSlugFromMessage } = useChatSlug(
    initialSlug,
    id
  );
  const { uiError, showError } = useChatErrors();
  const { ttsVoice } = useChatTTS(settings);

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

  const handleAppend = async (message: Omit<Message, "id">) => {
    const content =
      typeof message.content === "string"
        ? message.content.trim()
        : message.content;

    if (!content) {
      showError("Cannot send an empty message.");
      return;
    }

    // The AI SDK's append function handles adding a unique ID.
    await append(message);

    // Generate slug from the first message
    await generateSlugFromMessage(message.content as string);
  };

  const {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
    isTranscribing,
    transcriptionHookError,
  } = useChatInteraction({ append: handleAppend });

  const { stopAudioPlayback, speak } = useTextToSpeech({
    messages,
    isLoading,
    voice: ttsVoice,
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

  const { rtlStyles, centerRTLStyles, languageCode } = useRTL({
    selectedLanguage: settings?.selectedLanguage,
    nativeLanguage: settings?.nativeLanguage,
  });

  const { renderMessageContent } = useChatMessages(messages);

  const errorMessageStyling =
    "fixed bottom-40 left-1/2 transform -translate-x-1/2 p-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg shadow-lg z-10";

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto h-screen bg-white dark:bg-black overflow-hidden font-inter">
      <style jsx>{`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        .fade-in {
          animation: fadeIn 0.2s forwards;
        }
        .delay-1 {
          animation-delay: 0.05s;
        }
        .delay-2 {
          animation-delay: 0.1s;
        }
        .delay-3 {
          animation-delay: 0.15s;
        }

        /* Arabic and RTL language text sizing */
        [dir="rtl"] {
          font-size: 1.1em;
          line-height: 1.6;
        }

        /* Specific Arabic script languages */
        [lang="ar"],
        [lang="fa"],
        [lang="ur"] {
          font-size: 1.15em;
          line-height: 1.7;
        }

        /* Ensure RTL alignment for Hebrew */
        [lang="he"] {
          text-align: right !important;
          direction: rtl !important;
        }
      `}</style>

      <div className="relative flex justify-center fade-in">
        {/* Return to dashboard */}
        <Link
          href="/dashboard"
          aria-label="Back to Dashboard"
          className="mt-2 ml-0.5 absolute left-4 top-4 flex items-center gap-2 px-2 py-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-md shadow text-slate-600 dark:text-slate-300 hover:text-white transition-colors duration-200"
          style={{ backgroundColor: "rgba(23,6,100,0.05)" }}
        >
          <ArrowLeft
            className="h-5 w-5 flex-shrink-0"
            style={{ color: interfaceColor }}
          />
          <span
            className="text-sm font-medium hidden sm:inline"
            style={{ color: interfaceColor }}
          >
            Dashboard
          </span>
        </Link>
        <div className="text-center">
          <a href="/">
            <img
              src="/logo.svg"
              alt="Malan Logo"
              className="h-16 w-auto inline-block hover:opacity-70"
            />
          </a>
          <div className="relative mt-2 flex flex-col">
            <h2
              className="text-lg text-center font-semibold text-gray-700 dark:text-gray-300 break-words px-8"
              style={centerRTLStyles}
              lang={languageCode}
            >
              {slug}
            </h2>{" "}
            <br />
            <button
              onClick={async () => {
                const newSlug = prompt("Enter new chat title:", slug);
                if (newSlug) {
                  await handleSlugUpdate(newSlug);
                }
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200"
              style={
                {
                  color: "rgb(156 163 175)",
                  "--hover-color": interfaceColor,
                } as React.CSSProperties
              }
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = interfaceColor)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgb(156 163 175)")
              }
            >
              <EditIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-grow w-full pt-4 px-4 pb-4 fade-in delay-1 overflow-y-auto">
        {messages.length > 0 ? (
          <Virtuoso
            data={messages}
            followOutput="auto"
            initialTopMostItemIndex={messages.length - 1}
            increaseViewportBy={{ top: 400, bottom: 800 }}
            itemContent={(index: number, m: Message) => (
              <ChatMessage
                key={m.id}
                message={m}
                settings={settings}
                onSpeak={speak}
                renderMessageContent={renderMessageContent}
              />
            )}
          />
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
      </div>

      {uiError && <div className={errorMessageStyling}>{uiError}</div>}
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
      <ChatControls
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        status={status}
        pushToTalk={pushToTalk}
        setPushToTalk={setPushToTalk}
        startRecording={startRecording}
        stopRecording={stopRecording}
        stopAudioPlayback={stopAudioPlayback}
      />
    </div>
  );
}
