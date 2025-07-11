"use client";

import { useState, useRef, useCallback } from "react";

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  recordingError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAudioBlob: () => void;
}

export default function UseAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    setAudioBlob(null);
    setRecordingError(null);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedTypes = [
        "audio/mp4",
        "audio/webm",
        "audio/ogg",
        "audio/aac",
        "audio/mp3",
      ];
      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (!mimeType) {
        setRecordingError("No supported audio format found.");
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const duration = recordingStartTimeRef.current
          ? Date.now() - recordingStartTimeRef.current
          : 0;

        if (duration < 2000) {
          setRecordingError(
            "Recording too short. Please record for at least 2 seconds."
          );
          setTimeout(() => setRecordingError(null), 5000); // Clear error after 5s
          audioChunksRef.current = []; // Clear chunks
        } else {
          const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
          const newAudioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const file = new File([newAudioBlob], "audio.mp4", { type: mimeType });
          setAudioBlob(file);
        }

        setIsRecording(false);
        stream?.getTracks().forEach((track) => track.stop());
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setRecordingError("An error occurred during recording.");
        setIsRecording(false);
        stream?.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      if (
        err instanceof Error &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setRecordingError("Microphone permission denied. Please allow access.");
      } else {
        setRecordingError(
          "Failed to start recording. A microphone may not be connected."
        );
      }
      stream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearAudioBlob = useCallback(() => {
    setAudioBlob(null);
  }, []);

  return {
    isRecording,
    audioBlob,
    recordingError,
    startRecording,
    stopRecording,
    clearAudioBlob,
  };
}
