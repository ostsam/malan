import { useEffect, useRef, useState, useCallback } from "react";
import { type DotLottie } from "@lottiefiles/dotlottie-react";
import UseAudioRecorder from "./useRecorder";
import { useTranscription } from "./useTranscription";
import { useTextToSpeech } from "./useTextToSpeech";
import { useInputControls } from "./useInputControls";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatSettings } from "../tools/chat-store";

// Define the props for the hook, extracting from UseChatHelpers
type UseChatInteractionProps = Pick<
  UseChatHelpers,
  "messages" | "append" | "status" | "isLoading"
> & {
  settings: ChatSettings;
};

export const useChatInteraction = ({
  messages,
  append,
  status,
  isLoading,
  settings,
}: UseChatInteractionProps) => {
  const submissionRef = useRef(false);
  const dotLottiePlayerRef = useRef<DotLottie>(null);

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

  return {
    pushToTalk,
    setPushToTalk,
    isMobile,
    dotLottiePlayerRef,
    isRecording,
    isTranscribing,
    recordingError,
    transcriptionHookError,
    handleMicInteractionStart,
    handleMicInteractionEnd,
    handleMicClick,
    interlocutor,
  };
};