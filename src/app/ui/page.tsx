"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat, Message } from "@ai-sdk/react";
import UseAudioRecorder from "../hooks/useRecorder";
import { useTranscription } from "../hooks/useTranscription";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { createIdGenerator } from "ai";
import { languageLearningData } from "../dashboard/menu-data/languageLearningData";
import type { ChatData, ChatSettings } from "../tools/chat-store";

// Example default, adjust as needed
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
    stop,
    error: chatError,
    isLoading,
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

    // State for AI text-to-speech
    const [audioQueue, setAudioQueue] = useState<string[]>([]);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [currentSpokenMessageId, setCurrentSpokenMessageId] = useState<string | null>(null);
    const currentSpokenMessageIdRef = useRef(currentSpokenMessageId);
    useEffect(() => {
      currentSpokenMessageIdRef.current = currentSpokenMessageId;
    }, [currentSpokenMessageId]);

    const processedContentRef = useRef('');
    const textQueueRef = useRef('');
    const isProcessingAudioRef = useRef(false);

    const generateSpeech = useCallback(async (text: string): Promise<string | null> => {
      if (!text.trim()) return null;
      try {
        const response = await fetch("/api/chat/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "coral" }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to generate speech");
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error("Error generating speech:", error);
        return null;
      }
    }, []);

    // Effect to play audio from the queue
    useEffect(() => {
      if (audioQueue.length > 0 && !isPlayingAudio) {
        setIsPlayingAudio(true);
        const audioUrl = audioQueue[0];
        const audio = new Audio(audioUrl);
        audio.play().catch(e => {
          console.error("Audio playback failed:", e);
          URL.revokeObjectURL(audioUrl);
          setAudioQueue((prev) => prev.slice(1));
          setIsPlayingAudio(false);
        });
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setAudioQueue((prev) => prev.slice(1));
          setIsPlayingAudio(false);
        };
        audio.onerror = (e) => {
          console.error("Error playing audio:", e);
          URL.revokeObjectURL(audioUrl);
          setAudioQueue((prev) => prev.slice(1));
          setIsPlayingAudio(false);
        };
      }
    }, [audioQueue, isPlayingAudio]);

    const processQueue = useCallback(async () => {
      if (isProcessingAudioRef.current) return;
      isProcessingAudioRef.current = true;

      const workingMessageId = currentSpokenMessageIdRef.current;

      try {
        while (true) {
          if (workingMessageId !== currentSpokenMessageIdRef.current) {
            break;
          }

          const isStreamComplete = !isLoading;
          let textToSpeak = '';

          const sentenceEndMatch = textQueueRef.current.match(/[^.!?]+[.!?](?=\s|$)/);

          if (sentenceEndMatch) {
            textToSpeak = sentenceEndMatch[0];
            textQueueRef.current = textQueueRef.current.substring(textToSpeak.length);
          } else if (isStreamComplete && textQueueRef.current.trim().length > 0) {
            textToSpeak = textQueueRef.current.trim();
            textQueueRef.current = '';
          } else {
            break;
          }

          if (textToSpeak) {
            const audioUrl = await generateSpeech(textToSpeak);
            if (workingMessageId === currentSpokenMessageIdRef.current && audioUrl) {
              setAudioQueue(prev => [...prev, audioUrl]);
            }
          } else {
            break;
          }
        }
      } finally {
        isProcessingAudioRef.current = false;
        // After releasing the lock, check if there's more work to be done.
        // This handles the transition between an old message task and a new one.
        if (textQueueRef.current.trim().length > 0) {
          processQueue();
        }
      }
    }, [isLoading, generateSpeech]);

    // Producer effect: monitors messages and populates the text queue
    useEffect(() => {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage && lastMessage.role === 'assistant') {
        if (lastMessage.id !== currentSpokenMessageId) {
          setCurrentSpokenMessageId(lastMessage.id);
          setAudioQueue([]);
          setIsPlayingAudio(false);
          textQueueRef.current = lastMessage.content;
          processedContentRef.current = lastMessage.content;
        } else {
          if (lastMessage.content.length > processedContentRef.current.length) {
            const newText = lastMessage.content.substring(processedContentRef.current.length);
            textQueueRef.current += newText;
            processedContentRef.current = lastMessage.content;
          }
        }
        processQueue();
      }
    }, [messages, currentSpokenMessageId, processQueue]);
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
                  className={`max-w-[90%] rounded-3xl my-1 w-dvh p-4 text-md break-words shadow-md whitespace-pre-wrap ${
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
