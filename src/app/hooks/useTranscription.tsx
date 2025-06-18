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

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("Failed to read blob as base64 string."));
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Error converting blob to base64."));
    };
  });
};

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
        const base64Audio = await blobToBase64(audioBlob);
        const response = await fetch("/api/chat/transcription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64Audio }),
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
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
      } catch (err: any) {
        console.error("Error transcribing audio:", err);
        setTranscriptionError(
          err.message || "An error occurred during transcription."
        );
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
