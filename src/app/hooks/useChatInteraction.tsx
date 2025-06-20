import { useEffect, useRef } from 'react';
import { Message } from '@ai-sdk/react';
import UseAudioRecorder from './useRecorder';
import { useTranscription } from './useTranscription';

type UseChatInteractionProps = {
  append: (message: Omit<Message, 'id'>) => void;
};

export const useChatInteraction = ({ append }: UseChatInteractionProps) => {
  const submissionRef = useRef(false);

  const {
    isRecording,
    audioBlob,
    recordingError,
    startRecording,
    stopRecording,
    clearAudioBlob,
  } = UseAudioRecorder();

  const handleTranscriptionSuccess = (text: string) => {
    append({ role: 'user', content: text });
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

  return {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
    isTranscribing,
    transcriptionHookError,
  };
};