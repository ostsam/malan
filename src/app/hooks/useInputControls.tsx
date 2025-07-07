import { useState, useEffect, useCallback } from "react";

type UseInputControlsProps = {
  isRecording: boolean;
  isTranscribing: boolean;
  status: string;
  startRecording: () => void;
  stopRecording: () => void;
  stopAudioPlayback: () => void;
};

export const useInputControls = ({
  isRecording,
  isTranscribing,
  status,
  startRecording,
  stopRecording,
  stopAudioPlayback,
}: UseInputControlsProps) => {
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

  const handleMicInteractionStart = useCallback(() => {
    if (isMobile && pushToTalk) {
      if (!isRecording && !isTranscribing && status !== "submitted") {
        stopAudioPlayback();
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
  ]);

  const handleMicInteractionEnd = useCallback(() => {
    if (isMobile) {
      if (pushToTalk) {
        if (isRecording) {
          stopRecording();
        }
      } else {
        if (!(isTranscribing || status === "submitted")) {
          if (isRecording) {
            stopRecording();
          } else {
            stopAudioPlayback();
            startRecording();
          }
        }
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

  const handleMicClick = useCallback(() => {
    if (isMobile) {
      return;
    }
    if (!(isTranscribing || status === "submitted")) {
      if (isRecording) {
        stopRecording();
      } else {
        stopAudioPlayback();
        startRecording();
      }
    }
  }, [
    isMobile,
    isRecording,
    isTranscribing,
    status,
    startRecording,
    stopRecording,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === "KeyZ" && !event.repeat) {
        event.preventDefault();
        if (!isRecording && !isTranscribing && status !== "in_progress") {
          startRecording();
        }
      }
    },
    [isRecording, isTranscribing, status, startRecording]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "KeyZ") {
        event.preventDefault();
        if (isRecording) {
          stopRecording();
        }
        if (stopAudioPlayback) {
          stopAudioPlayback();
        }
      }
    },
    [isRecording, stopRecording, stopAudioPlayback]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (!isRecording && !isTranscribing && status !== "in_progress") {
        startRecording();
      }
    },
    [isRecording, isTranscribing, status, startRecording, stopAudioPlayback]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (isRecording) {
        stopRecording();
      }
      if (stopAudioPlayback) {
        stopAudioPlayback();
      }
    },
    [isRecording, stopRecording, stopAudioPlayback]
  );

  useEffect(() => {
    if (pushToTalk) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, [pushToTalk, handleKeyDown, handleKeyUp]);

  return {
    pushToTalk,
    setPushToTalk,
    isMobile,
    handleMicInteractionStart,
    handleMicInteractionEnd,
    handleMicClick,
  };
};
