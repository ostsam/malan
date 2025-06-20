"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '@ai-sdk/react';

async function generateSpeechAPI(text: string, voice: string): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const response = await fetch("/api/chat/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
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
}

interface UseTextToSpeechProps {
  messages: Message[];
  isLoading: boolean;
  voice?: string; // Optional voice parameter, defaults to 'coral'
}

export function useTextToSpeech({
  messages,
  isLoading,
  voice = 'coral',
}: UseTextToSpeechProps): void {
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSpokenMessageId, setCurrentSpokenMessageId] = useState<string | null>(null);
  
  const currentSpokenMessageIdRef = useRef(currentSpokenMessageId);
  const processedContentRef = useRef('');
  const textQueueRef = useRef('');
  const isProcessingAudioRef = useRef(false);

  useEffect(() => {
    currentSpokenMessageIdRef.current = currentSpokenMessageId;
  }, [currentSpokenMessageId]);

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
          break; // New message has started, stop processing for the old one
        }

        const isStreamComplete = !isLoading;
        let textToSpeak = '';

        // Try to find a complete sentence
        const sentenceEndMatch = textQueueRef.current.match(/[^.!?]+[.!?](?=\s|$)/);

        if (sentenceEndMatch) {
          textToSpeak = sentenceEndMatch[0];
          textQueueRef.current = textQueueRef.current.substring(textToSpeak.length);
        } else if (isStreamComplete && textQueueRef.current.trim().length > 0) {
          // If stream is complete and there's remaining text, speak it all
          textToSpeak = textQueueRef.current.trim();
          textQueueRef.current = '';
        } else {
          break; // No complete sentence and stream is not complete, or no text left
        }

        if (textToSpeak) {
          const audioUrl = await generateSpeechAPI(textToSpeak, voice);
          // Ensure we are still processing the same message before queuing audio
          if (workingMessageId === currentSpokenMessageIdRef.current && audioUrl) {
            setAudioQueue(prev => [...prev, audioUrl]);
          }
        } else {
          break; // No text to speak
        }
      }
    } finally {
      isProcessingAudioRef.current = false;
      // If there's still text in the queue (e.g., due to a new message interrupting),
      // and the lock is released, try to process again.
      if (textQueueRef.current.trim().length > 0 && !isProcessingAudioRef.current) {
        processQueue();
      }
    }
  }, [isLoading, voice, generateSpeechAPI]);

  // Producer effect: monitors messages and populates the text queue
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === 'assistant') {
      if (lastMessage.id !== currentSpokenMessageId) {
        // New assistant message or initial message
        setCurrentSpokenMessageId(lastMessage.id);
        setAudioQueue([]); // Clear queue for the new message
        setIsPlayingAudio(false); // Reset playing state
        textQueueRef.current = lastMessage.content; // Initialize text queue
        processedContentRef.current = lastMessage.content; // Track processed content
      } else {
        // Existing assistant message is being streamed
        if (lastMessage.content.length > processedContentRef.current.length) {
          const newText = lastMessage.content.substring(processedContentRef.current.length);
          textQueueRef.current += newText; // Append new chunk to the text queue
          processedContentRef.current = lastMessage.content; // Update processed content length
        }
      }
      processQueue(); // Attempt to process the queue
    }
  }, [messages, currentSpokenMessageId, processQueue]);
}
