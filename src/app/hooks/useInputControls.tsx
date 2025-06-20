import { useState, useEffect, useCallback } from 'react';

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
        typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const hasTouch =
        typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsMobile(
        mobileRegex.test(userAgent) || (hasTouch && window.innerWidth < 768)
      );
    };
    checkIsMobile(); // Initial check
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleMicInteractionStart = useCallback(() => {
    if (isMobile && pushToTalk) {
      if (!isRecording && !isTranscribing && status !== 'submitted') {
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
        if (!(isTranscribing || status === 'submitted')) {
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
    if (!(isTranscribing || status === 'submitted')) {
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

  useEffect(() => {
    if (isMobile) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === 'KeyZ') {
        event.preventDefault();
        if (pushToTalk) {
          if (!isRecording && !isTranscribing && status !== 'submitted') {
            stopAudioPlayback();
            startRecording();
          }
        } else {
          if (!isTranscribing && status !== 'submitted') {
            if (isRecording) {
              stopRecording();
            } else {
              stopAudioPlayback();
              startRecording();
            }
          }
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (pushToTalk && event.code === 'KeyZ' && isRecording) {
        event.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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