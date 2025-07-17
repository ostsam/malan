"use client";

import { useEffect, useRef, useState } from "react";
import { useChat, Message } from "@ai-sdk/react";
import { useTextToSpeech } from "../../app/hooks/useTextToSpeech";
import { useChatInteraction } from "../../app/hooks/useChatInteraction";
import { useInputControls } from "../../app/hooks/useInputControls";
import { EditIcon, Lock, Star, ArrowLeft, BookOpen } from "lucide-react";
import { createIdGenerator } from "ai";
import { interfaceColor } from "@/lib/theme";
import { useRTL } from "@/app/hooks/useRTL";
import { useChatSlug } from "@/app/hooks/useChatSlug";

import { useChatMessages } from "@/app/hooks/useChatMessages";
import { useChatTTS } from "@/app/hooks/useChatTTS";
import { useChatErrors } from "@/app/hooks/useChatErrors";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatControls } from "@/components/chat/ChatControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import Image from "next/image";
import {
  convertChineseText,
  getUserChineseScriptPreference,
} from "@/lib/chinese-converter";

// Types for real and demo chat
export interface SerializableChatData {
  slug?: string;
  settings: ChatSettings;
  messages: Array<Omit<Message, "createdAt"> & { createdAt?: string }>;
  createdAt?: string;
}

import type { ChatSettings as ChatStoreSettings } from "@/app/tools/chat-store";

export interface ChatSettings {
  selectedLanguage?: string | null;
  nativeLanguage?: string | null;
  selectedLanguageLabel?: string | null;
  nativeLanguageLabel?: string | null;
  selectedLevel?: string | null;
  interlocutor?: string | null;
  name?: string | null;
}

export interface DemoSettings {
  nativeLanguage: string;
  nativeLanguageLabel: string;
  selectedLanguage: string;
  selectedLanguageLabel: string;
  selectedLevel: string;
  interlocutor: string;
  isDemo: boolean;
}

interface ChatSessionProps {
  id?: string;
  chatObject?: SerializableChatData;
  demoMode?: boolean;
  demoSettings?: DemoSettings;
  messageLimit?: number;
  onSignupPrompt?: () => void;
}

export function ChatSession({
  id,
  chatObject,
  demoMode = false,
  demoSettings,
  messageLimit = 6,
  onSignupPrompt,
}: ChatSessionProps) {
  // Use the same chat slug hook for both demo and regular modes
  const { slug, handleSlugUpdate, generateSlugFromMessage } = useChatSlug(
    demoMode ? "" : chatObject?.slug, 
    demoMode ? "demo" : id
  );

  const { uiError, showError } = useChatErrors();
  const { ttsVoice } = useChatTTS(
    demoMode
      ? {
          selectedLanguage: demoSettings!.selectedLanguage || "en",
          interlocutor: demoSettings!.interlocutor,
        }
      : {
          selectedLanguage: chatObject?.settings?.selectedLanguage || "en",
          interlocutor: (chatObject?.settings as ChatSettings)?.interlocutor as
            | string
            | undefined,
        }
  );

  // Check if user is authenticated
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;

  // Chinese script state
  const [chineseScript, setChineseScript] = useState<
    "traditional" | "simplified"
  >("simplified");
  const [convertedMessages, setConvertedMessages] = useState<Message[]>([]);

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Deserialize messages for real chat
  const initialMessages: Message[] = demoMode
    ? []
    : (chatObject?.messages || []).map((message) => ({
        ...message,
        createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
      }));

  // Debug: Log initial messages
  

  const {
    messages,
    append,
    status,
    error: chatError,
    isLoading: isChatLoading,
  } = useChat({
    id: demoMode ? "demo" : id,
    api: "/api/chat", // Use the same API route for both demo and regular modes
    initialMessages: demoMode ? undefined : initialMessages,
    sendExtraMessageFields: true,
    generateId: createIdGenerator({
      prefix: "msgc",
      size: 16,
    }),
    body: demoMode
      ? {
          settings: demoSettings,
          isDemo: true, // Flag to indicate demo mode to the API
        }
      : undefined,
  });

  // Debug: Log messages from useChat
  

  // Define settings before using it in useEffect
  const settings = demoMode ? demoSettings! : chatObject?.settings;

  // Load initial Chinese script preference
  useEffect(() => {
    const userPreference = getUserChineseScriptPreference();
    setChineseScript(userPreference);
  }, []);

  // Convert messages when Chinese script changes
  useEffect(() => {
    const convertMessages = async () => {
      if (messages.length === 0) {
        setConvertedMessages([]);
        return;
      }

      const converted = await Promise.all(
        messages.map(async (message) => {
          const content =
            typeof message.content === "string" ? message.content : "";

          // Only convert if it's Chinese text
          if (
            content &&
            (settings?.selectedLanguage === "zh" ||
              /[\u4e00-\u9fff]/.test(content))
          ) {
            try {
              const convertedContent = await convertChineseText(
                content,
                chineseScript
              );
              return {
                ...message,
                content: convertedContent,
              };
            } catch (error) {
              console.error("Error converting message:", error);
              return message;
            }
          }
          return message;
        })
      );

      setConvertedMessages(converted);
    };

    convertMessages();
  }, [messages, chineseScript, settings?.selectedLanguage]);

  // Debug: Log converted messages
  

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convertedMessages]);

  const messageCount = messages.length;

  // Track demo message count in localStorage
  useEffect(() => {
    if (demoMode && typeof window !== "undefined") {
      localStorage.setItem("demoMessageCount", messageCount.toString());
    }
  }, [demoMode, messageCount]);

  const handleAppend = async (message: Omit<Message, "id">) => {
    const content =
      typeof message.content === "string"
        ? message.content.trim()
        : message.content;

    if (!content) {
      showError("Cannot send an empty message.");
      return;
    }

    // Check message limit for demo mode
    // TEMPORARILY DISABLED FOR TESTING
    // if (demoMode && messageCount >= messageLimit) {
    //   showError("Demo limit reached. Please sign up to continue.");
    //   return;
    // }

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
    messages: convertedMessages,
    isLoading: isChatLoading,
    voice: ttsVoice,
  });

  const { pushToTalk, setPushToTalk } = useInputControls({
    isRecording,
    isTranscribing,
    status,
    startRecording,
    stopRecording,
    stopAudioPlayback,
  });

  const { centerRTLStyles, languageCode } = useRTL({
    selectedLanguage: demoMode
      ? demoSettings?.selectedLanguage
      : chatObject?.settings?.selectedLanguage,
    nativeLanguage: demoMode
      ? demoSettings?.nativeLanguage
      : chatObject?.settings?.nativeLanguage,
  });

  const { renderMessageContent } = useChatMessages(convertedMessages);

  const errorMessageStyling =
    "fixed bottom-40 left-1/2 transform -translate-x-1/2 p-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg shadow-lg z-10";

  const handleScriptChange = async (script: "traditional" | "simplified") => {
    setChineseScript(script);
    // The page refresh in the toggle component will handle the conversion
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto h-screen text-lg bg-white dark:bg-black overflow-hidden font-inter">
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

      <div className="relative flex flex-col items-center fade-in">
        {/* Header with navigation buttons for authenticated users */}
        <div className="flex items-center justify-between w-full px-4 py-2">
          {/* Left side - Back to dashboard button for authenticated users */}
          {isAuthenticated && (
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
                title="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              </Button>
            </Link>
          )}

          {/* Center - Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/">
              <Image
                src="/logo.svg"
                alt="Malan Logo"
                className="h-12 w-auto hover:opacity-70"
                width={120}
                height={48}
              />
            </Link>
          </div>

          {/* Right side - Wordlist button for authenticated users */}
          {isAuthenticated && (
            <Link href="/wordlist">
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
                title="Go to wordlist"
              >
                <BookOpen className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              </Button>
            </Link>
          )}

          {/* Spacer for non-authenticated users to keep logo centered */}
          {!isAuthenticated && <div className="w-10" />}
        </div>

        {/* Slug/title underneath */}
        <div className="text-center px-4 mt-1">
          <h2
            className="text-lg font-semibold text-gray-700 dark:text-gray-300 break-words"
            style={centerRTLStyles}
            lang={languageCode}
          >
            {slug}
          </h2>
          {!demoMode && (
            <button
              onClick={async () => {
                const newSlug = prompt("Enter new chat title:", slug);
                if (newSlug) {
                  await handleSlugUpdate(newSlug);
                }
              }}
              className="text-gray-400 hover:text-[#3C18D9] transition-colors duration-200"
            >
              <EditIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow w-full pt-4 px-4 pb-4 fade-in delay-1 overflow-y-auto">
        {convertedMessages.length > 0 ? (
          <div className="flex flex-col space-y-4">
            {convertedMessages.map((m: Message) => (
              <ChatMessage
                key={m.id}
                message={m}
                settings={
                  settings as ChatSettings
                }
                onSpeak={speak}
                renderMessageContent={renderMessageContent}
                isDemo={demoMode}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between py-8 text-center text-gray-600 dark:text-gray-400">
            <div>
              <p className="text-2xl">Instructions:</p>
              <p className="text-l mt-3">
                Begin speaking{" "}
                {(settings as ChatSettings)?.selectedLanguageLabel as string}.{" "}
                {(settings as ChatSettings)?.interlocutor as string} will have
                you speaking fluidly about your day, your interests, or anything
                else you&apos;d like in no time!
              </p>
            </div>
            <div className="text-md pb-4">
              <p>1. Press the button and speak to begin</p>
              <p>2. Release it to end the transmission.</p>
              <p>
                3. Await response from{" "}
                {(settings as ChatSettings)?.interlocutor as string}.
              </p>
            </div>
          </div>
        )}

        {/* Signup prompt when limit reached (demo only) */}
        {/* TEMPORARILY DISABLED FOR TESTING */}
        {/* {demoMode && messageCount >= messageLimit && (
          <div className="mt-0">
            <Card className="border-[#3C18D9] bg-[#edebf3]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#3C18D9] flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Sign up to continue
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p className="mb-4">
                  You&apos;ve reached the demo limit! Sign up now to continue
                  your conversation with{" "}
                  {(settings as ChatSettings)?.interlocutor as string} and
                  unlock unlimited learning.
                </p>
                <Button
                  onClick={onSignupPrompt}
                  className="flex-1"
                  style={{ backgroundColor: interfaceColor }}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Sign up to continue
                </Button>
              </CardContent>
            </Card>
          </div>
        )} */}
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

      {/* Chat Controls - disabled when limit reached in demo mode */}
      {/* TEMPORARILY DISABLED FOR TESTING - always show controls */}
      <ChatControls
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        status={status}
        pushToTalk={pushToTalk}
        setPushToTalk={setPushToTalk}
        startRecording={startRecording}
        stopRecording={stopRecording}
        stopAudioPlayback={stopAudioPlayback}
        selectedLanguage={(settings as ChatSettings)?.selectedLanguage}
        onScriptChange={handleScriptChange}
      />
      {/* Original conditional logic:
      {(demoMode ? messageCount < messageLimit : true) ? (
        <ChatControls
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          status={status}
          pushToTalk={pushToTalk}
          setPushToTalk={setPushToTalk}
          startRecording={startRecording}
          stopRecording={stopRecording}
          stopAudioPlayback={stopAudioPlayback}
          selectedLanguage={(settings as ChatSettings)?.selectedLanguage}
          onScriptChange={handleScriptChange}
        />
      ) : null}
      */}
    </div>
  );
}
