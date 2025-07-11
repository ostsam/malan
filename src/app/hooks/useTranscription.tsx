"use client";

import { useState, useCallback } from "react";

interface UseTranscriptionProps {
  onTranscriptionSuccess: (text: string) => void;
}

export interface UseTranscriptionReturn {
  isTranscribing: boolean;
  transcriptionError: string | null;
  submitTranscription: (audioBlob: Blob) => Promise<void>;
  clearTranscriptionError: () => void;
}

export function useTranscription({
  onTranscriptionSuccess,
}: UseTranscriptionProps): UseTranscriptionReturn {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );

  const clearTranscriptionError = useCallback(() => {
    setTranscriptionError(null);
  }, []);

  const submitTranscription = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob) return;

      setIsTranscribing(true);
      setTranscriptionError(null);

      try {
        const formData = new FormData();
        formData.append("audioFile", audioBlob, "audio.webm"); // Added filename

        const response = await fetch("/api/chat/transcription", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            // If response is not JSON, use status text
            throw new Error(
              response.statusText || "Transcription request failed"
            );
          }
          throw new Error(
            errorData?.error ||
              `Transcription failed with status: ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error(
            "Failed to get response stream from transcription API."
          );
        }

        const readerStream = response.body.getReader();
        let transcribedText = "";
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await readerStream.read();
          if (done) break;
          transcribedText += decoder.decode(value, { stream: true });
        }
        onTranscriptionSuccess(transcribedText);
      } catch (err: unknown) {
        console.error("Transcription error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Transcription failed";
        setTranscriptionError(errorMessage);
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscriptionSuccess]
  );

  return {
    isTranscribing,
    transcriptionError,
    submitTranscription,
    clearTranscriptionError,
  };
}
