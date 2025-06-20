"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseInputControlsProps {
  isRecording: boolean;
  isTranscribing: boolean;
  status: string;
  startRecording: () => void;
  stopRecording: () => void;
}

export const useInputControls = ({
  isRecording,
  isTranscribing,
  status,
  startRecording,
  stopRecording,
}: UseInputControlsProps) => {
  const [pushToTalk, setPushToTalk] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const wasStartedByThisInteractionRef = useRef(false);

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

  const handleToggleRecording = useCallback(() => {
    if (!(isTranscribing || status === "submitted")) {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  }, [isRecording, isTranscribing, status, startRecording, stopRecording]);

  const handleMicInteractionStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (isMobile && pushToTalk) {
        if (!isRecording && !isTranscribing && status !== "submitted") {
          startRecording();
          wasStartedByThisInteractionRef.current = true;
        }
      }
    },
    [isMobile, pushToTalk, isRecording, isTranscribing, status, startRecording]
  );

  const handleMicInteractionEnd = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (isMobile) {
        if (pushToTalk) {
          if (isRecording && wasStartedByThisInteractionRef.current) {
            stopRecording();
          }
          wasStartedByThisInteractionRef.current = false;
        } else {
          // This is a tap on mobile for tap-to-talk mode
          event.preventDefault();
          handleToggleRecording();
        }
      }
    },
    [isMobile, pushToTalk, isRecording, stopRecording, handleToggleRecording]
  );

  const handleMicClick = useCallback(() => {
    // On mobile, this is handled by onTouchEnd to avoid ghost clicks.
    // On desktop, this is the primary event.
    if (!isMobile) {
      handleToggleRecording();
    }
  }, [isMobile, handleToggleRecording]);

  useEffect(() => {
    if (isMobile) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === "KeyZ") {
        event.preventDefault();
        if (pushToTalk) {
          if (!isRecording && !isTranscribing && status !== "submitted") {
            startRecording();
          }
        } else {
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

  return {
    pushToTalk,
    setPushToTalk,
    isMobile,
    handleMicInteractionStart,
    handleMicInteractionEnd,
    handleMicClick,
  };
};
