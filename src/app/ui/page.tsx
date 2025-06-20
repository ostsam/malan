"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat, Message } from "@ai-sdk/react";
import UseAudioRecorder from "../hooks/useRecorder";
import { useTranscription } from "../hooks/useTranscription";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { createIdGenerator } from "ai";
import { languageLearningData } from "../dashboard/menu-data/languageLearningData";
import type { ChatData, ChatSettings } from "../tools/chat-store";
import Switch from "react-switch";
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
    const [pushToTalk, setPushToTalk] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkIsMobile = () => {
        const userAgent =
          typeof window.navigator === "undefined" ? "" : navigator.userAgent;
        const mobileRegex =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const hasTouch =
          typeof window !== "undefined" &&
          ("ontouchstart" in window || navigator.maxTouchPoints > 0);
        setIsMobile(
          mobileRegex.test(userAgent) || (hasTouch && window.innerWidth < 768)
        );
      };
      checkIsMobile(); // Initial check
      window.addEventListener("resize", checkIsMobile);
      return () => window.removeEventListener("resize", checkIsMobile);
    }, []);
    const errorMessageStyling =
      "fixed bottom-32 left-1/2 transform -translate-x-1/2 p-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg shadow-lg";
    const micCaptionStyling = "text-md text-gray-600 dark:text-gray-400 mb-1";

    const submissionRef = useRef(false);
    const wasStartedByThisInteractionRef = useRef(false);
    const dotLottiePlayerRef = useRef<DotLottie>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Use the custom hook for Text-to-Speech functionality
    useTextToSpeech({ messages, isLoading, voice: "coral" });

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

    const handleMicInteractionStart = useCallback(() => {
      if (isMobile && pushToTalk) {
        if (!isRecording && !isTranscribing && status !== "submitted") {
          startRecording();
          wasStartedByThisInteractionRef.current = true; // Track that this interaction started recording
        }
      }
    }, [
      isMobile,
      pushToTalk,
      isRecording,
      isTranscribing,
      status,
      startRecording,
    ]);

    const handleMicInteractionEnd = useCallback(() => {
      if (isMobile && pushToTalk) {
        if (isRecording && wasStartedByThisInteractionRef.current) {
          stopRecording();
        }
        wasStartedByThisInteractionRef.current = false; // Reset for the next interaction
      }
    }, [isMobile, pushToTalk, isRecording, stopRecording]);

    const handleMicClick = useCallback(() => {
      if (isMobile && pushToTalk) {
        // On mobile with "hold to talk" enabled, click is handled by touch/mouse events.
        return;
      }
      // Standard toggle behavior for desktop or when mobile "hold to talk" is off.
      if (!(isTranscribing || status === "submitted")) {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    }, [
      isMobile,
      pushToTalk,
      isRecording,
      isTranscribing,
      status,
      startRecording,
      stopRecording,
    ]);

    // Keyboard shortcut for recording (Desktop only)
    useEffect(() => {
      if (isMobile) {
        return; // Disable keyboard shortcuts on mobile
      }
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.shiftKey && event.code === "KeyZ") {
          event.preventDefault();

          if (pushToTalk) {
            // Push-to-talk: start on keydown if not already recording
            if (!isRecording && !isTranscribing && status !== "submitted") {
              startRecording();
            }
          } else {
            // Toggle mode: start or stop on keydown
            if (!isTranscribing && status !== "submitted") {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }
          }
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        // Only applies to push-to-talk mode
        if (pushToTalk && event.code === "KeyZ" && isRecording) {
          event.preventDefault();
          stopRecording();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [
      isMobile,
      pushToTalk,
      isRecording,
      isTranscribing,
      status,
      startRecording,
      stopRecording,
    ]);

    return (
      <div className="flex flex-col w-full max-w-xl mx-auto h-screen bg-white dark:bg-black">
        <div
          ref={messagesContainerRef}
          className="flex-grow overflow-y-auto w-full px-4"
        >
          <div className="relative h-full mt-2">
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
                    {m.content}
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
                  <p>3. Await response from {interlocutor}.</p>
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

      {/* Centered Microphone */}
      <div className="flex flex-col items-center justify-center">
        <div // Wrapper for touch/mouse events
          onMouseDown={handleMicInteractionStart}
          onMouseUp={handleMicInteractionEnd}
          onTouchStart={handleMicInteractionStart}
          onTouchEnd={handleMicInteractionEnd}
          onClick={handleMicClick}
          role="button"
          tabIndex={0}
          aria-pressed={isRecording}
          className={`${ 
            (isTranscribing || status === "submitted")
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
              (isTranscribing || status === "submitted")
                ? "opacity-50"
                : ""
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
}
