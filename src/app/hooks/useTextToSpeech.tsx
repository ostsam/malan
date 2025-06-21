"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message } from "@ai-sdk/react";

async function generateSpeechAPI(
  text: string,
  voice: string
): Promise<string | null> {
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

export interface AudioQueueItem {
  url: string;
  pauseAfterMs: number;
  textFragment: string; // For debugging or potential future use
}

export function useTextToSpeech({
  messages,
  isLoading,
  voice = "nova",
}: UseTextToSpeechProps): { stopAudioPlayback: () => void } {
  const [audioQueue, setAudioQueue] = useState<AudioQueueItem[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSpokenMessageId, setCurrentSpokenMessageId] = useState<
    string | null
  >(null);

  const currentSpokenMessageIdRef = useRef(currentSpokenMessageId);
  const unprocessedTextSegmentsRef = useRef<string[]>([]);
  const processedStreamContentRef = useRef<string>("");
  const currentlyGeneratingForMessageIdRef = useRef<string | null>(null);
  const isProcessingAudioRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const sentenceEndRef = useRef<string>("");
  const interruptedMessageIdRef = useRef<string | null>(null);

  const stopAudioPlayback = useCallback(() => {
    console.log("TTS: Stop audio playback requested.");

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
    }

    setAudioQueue((prevQueue) => {
      prevQueue.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });

    setIsPlayingAudio(false);
    unprocessedTextSegmentsRef.current = [];
    sentenceEndRef.current = "";

    interruptedMessageIdRef.current = currentSpokenMessageIdRef.current;
    setCurrentSpokenMessageId(null);

    currentlyGeneratingForMessageIdRef.current = null;
    isProcessingAudioRef.current = false;
  }, [setAudioQueue]);

  useEffect(() => {
    currentSpokenMessageIdRef.current = currentSpokenMessageId;
  }, [currentSpokenMessageId]);

  const processQueue = useCallback(async () => {
    if (isProcessingAudioRef.current) return;
    isProcessingAudioRef.current = true;

    const processingMessageId = currentSpokenMessageIdRef.current;
    currentlyGeneratingForMessageIdRef.current = processingMessageId;

    try {
      while (
        unprocessedTextSegmentsRef.current.length > 0 ||
        (sentenceEndRef.current && !isLoading)
      ) {
        if (processingMessageId !== currentSpokenMessageIdRef.current) {
          console.log(
            "TTS: Message ID changed during processQueue. Aborting for:",
            processingMessageId
          );
          currentlyGeneratingForMessageIdRef.current = null;
          break;
        }

        let textForTTS = "";
        let currentSegment = "";

        if (unprocessedTextSegmentsRef.current.length > 0) {
          currentSegment = unprocessedTextSegmentsRef.current[0];
        }

        let combinedText = sentenceEndRef.current + currentSegment;
        sentenceEndRef.current = ""; // Clear after use for this iteration

        if (
          !combinedText.trim() &&
          unprocessedTextSegmentsRef.current.length > 0
        ) {
          // Current segment might be empty or whitespace, and sentenceEndRef was also empty.
          unprocessedTextSegmentsRef.current.shift(); // Consume empty/whitespace segment
          continue; // Get next segment
        }
        if (
          !combinedText.trim() &&
          unprocessedTextSegmentsRef.current.length === 0 &&
          isLoading
        ) {
          break; // No text and stream is ongoing, wait for more data
        }
        if (
          !combinedText.trim() &&
          unprocessedTextSegmentsRef.current.length === 0 &&
          !isLoading
        ) {
          break; // No text and stream is done.
        }

        // Sentence splitting logic (simplified: uses common terminators)
        // A more robust NLP sentence tokenizer would be better for complex cases.
        const sentenceTerminators = /[.!?。！？؟¿¡]+(?=\s+|$)/g;
        let lastMatchEnd = 0;
        let match;

        while ((match = sentenceTerminators.exec(combinedText)) !== null) {
          const rawChunk = combinedText.substring(
            lastMatchEnd,
            match.index + match[0].length
          );
          textForTTS = rawChunk.trim();
          lastMatchEnd = sentenceTerminators.lastIndex;

          if (textForTTS) {
            if (processingMessageId !== currentSpokenMessageIdRef.current)
              break;
            console.log("TTS: Generating for sentence:", textForTTS);
            const audioUrl = await generateSpeechAPI(textForTTS, voice);
            if (
              currentlyGeneratingForMessageIdRef.current ===
                processingMessageId &&
              audioUrl
            ) {
              let pauseAfterMs = 0;
              // Prioritize pause for line breaks
              if (rawChunk.includes("\n")) {
                pauseAfterMs = 150;
              } else if (/[.!?。！？؟]$/.test(textForTTS)) {
                // Ends with period, question mark, or exclamation
                pauseAfterMs = 150; // Pause for sentence end
              } else if (/,$/.test(textForTTS)) {
                // Ends with comma
                pauseAfterMs = 75; // Shorter pause for comma
              }
              console.log(
                `TTS: Queuing audio for '${textForTTS}', pause: ${pauseAfterMs}ms`
              );
              setAudioQueue((prev) => [
                ...prev,
                { url: audioUrl, pauseAfterMs, textFragment: textForTTS },
              ]);
            } else if (audioUrl) {
              URL.revokeObjectURL(audioUrl); // Clean up unused URL
            }
          }
        }
        if (processingMessageId !== currentSpokenMessageIdRef.current) break; // Check again after loop

        const remainingText = combinedText.substring(lastMatchEnd).trim();

        if (unprocessedTextSegmentsRef.current.length > 0) {
          unprocessedTextSegmentsRef.current.shift(); // Consume the processed segment
        }

        if (remainingText) {
          if (!isLoading && unprocessedTextSegmentsRef.current.length === 0) {
            // This is the very last bit of text, and the stream is complete.
            console.log(
              "TTS: Generating for final remaining text:",
              remainingText
            );
            textForTTS = remainingText;
            const audioUrl = await generateSpeechAPI(textForTTS, voice);
            if (
              currentlyGeneratingForMessageIdRef.current ===
                processingMessageId &&
              audioUrl
            ) {
              let pauseAfterMs = 0; // Usually no extra pause for the very final fragment unless it's a full sentence.
              if (/[.!?]$/.test(textForTTS)) {
                pauseAfterMs = 300;
              }
              console.log(
                `TTS: Queuing audio for final fragment '${textForTTS}', pause: ${pauseAfterMs}ms`
              );
              setAudioQueue((prev) => [
                ...prev,
                { url: audioUrl, pauseAfterMs, textFragment: textForTTS },
              ]);
            } else if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
            }
          } else {
            // Stream is ongoing or more segments exist, so store as partial sentence.
            console.log("TTS: Storing partial sentence:", remainingText);
            sentenceEndRef.current = remainingText;
          }
        }
        // If sentenceEndRef has content but no more segments and stream is loading, wait.
        if (
          sentenceEndRef.current &&
          unprocessedTextSegmentsRef.current.length === 0 &&
          isLoading
        ) {
          break;
        }
      }
    } catch (error) {
      console.error("TTS: Error in processQueue:", error);
    } finally {
      isProcessingAudioRef.current = false;
      if (currentlyGeneratingForMessageIdRef.current === processingMessageId) {
        currentlyGeneratingForMessageIdRef.current = null; // Clear only if it's still for this run
      }
      // Re-trigger if there's still work to do
      if (
        (unprocessedTextSegmentsRef.current.length > 0 ||
          (sentenceEndRef.current && !isLoading)) &&
        !isProcessingAudioRef.current
      ) {
        console.log("TTS: Re-triggering processQueue from finally.");
        processQueue();
      }
    }
  }, [isLoading, voice, generateSpeechAPI, setAudioQueue]); // setAudioQueue is a stable dispatcher

  // Effect to play audio from the queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio) {
      const currentAudioItem = audioQueue[0];
      setIsPlayingAudio(true);
      console.log(
        "TTS: Playing audio for:",
        currentAudioItem.textFragment,
        "Pause after:",
        currentAudioItem.pauseAfterMs
      );
      const audio = new Audio(currentAudioItem.url);
      audioPlayerRef.current = audio;

      const cleanupAndProceed = (itemToClean: AudioQueueItem) => {
        URL.revokeObjectURL(itemToClean.url);
        if (audioPlayerRef.current === audio) audioPlayerRef.current = null;

        const proceed = () => {
          setAudioQueue((prev) => prev.slice(1));
          setIsPlayingAudio(false);
          if (
            (unprocessedTextSegmentsRef.current.length > 0 ||
              (sentenceEndRef.current && !isLoading)) &&
            !isProcessingAudioRef.current
          ) {
            console.log("TTS: Triggering processQueue from playback cleanup.");
            processQueue();
          }
        };

        if (itemToClean.pauseAfterMs > 0) {
          console.log(
            `TTS: Pausing for ${itemToClean.pauseAfterMs}ms after:`,
            itemToClean.textFragment
          );
          setTimeout(proceed, itemToClean.pauseAfterMs);
        } else {
          proceed();
        }
      };

      audio.play().catch((e) => {
        console.error(
          "Audio playback failed:",
          e,
          currentAudioItem.textFragment
        );
        cleanupAndProceed(currentAudioItem);
      });
      audio.onended = () => {
        console.log("TTS: Audio ended for:", currentAudioItem.textFragment);
        cleanupAndProceed(currentAudioItem);
      };
      audio.onerror = (e) => {
        console.error("Error playing audio:", e, currentAudioItem.textFragment);
        cleanupAndProceed(currentAudioItem);
      };
    }
  }, [audioQueue, isPlayingAudio, processQueue, isLoading]); // Added isLoading to deps for sentenceEndRef check

  // Producer effect: monitors messages and populates unprocessedTextSegmentsRef
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === "assistant") {
      if (lastMessage.id === interruptedMessageIdRef.current) {
        return;
      }

      if (lastMessage.id !== currentSpokenMessageId) {
        interruptedMessageIdRef.current = null;
        // New assistant message ID
        console.log(
          `TTS: New assistant message ID: ${lastMessage.id}. Resetting TTS.`
        );
        if (audioPlayerRef.current) {
          console.log("TTS: Pausing existing audio due to new message ID.");
          audioPlayerRef.current.pause();
          audioPlayerRef.current.src = ""; // Release resource
          audioPlayerRef.current = null;
        }
        setCurrentSpokenMessageId(lastMessage.id);
        setAudioQueue([]); // Clear pending audio from old message
        setIsPlayingAudio(false); // Reset playing state
        unprocessedTextSegmentsRef.current = [lastMessage.content];
        processedStreamContentRef.current = lastMessage.content;
        sentenceEndRef.current = "";
        console.log(
          "TTS: Queued initial content for new message:",
          lastMessage.content
        );
        if (!isProcessingAudioRef.current) {
          console.log(
            "TTS: Triggering processQueue from producer (new message)."
          );
          processQueue();
        }
      } else if (
        lastMessage.id === currentSpokenMessageId &&
        lastMessage.content.length > processedStreamContentRef.current.length
      ) {
        // Existing assistant message is being streamed
        const newTextChunk = lastMessage.content.substring(
          processedStreamContentRef.current.length
        );
        if (newTextChunk.length > 0) {
          console.log(
            "TTS: Adding new text chunk to unprocessed queue:",
            newTextChunk
          );
          unprocessedTextSegmentsRef.current.push(newTextChunk);
          processedStreamContentRef.current = lastMessage.content;
          if (!isProcessingAudioRef.current && !isPlayingAudio) {
            // Also check !isPlayingAudio to avoid interrupting current sentence's natural flow too abruptly
            console.log(
              "TTS: Triggering processQueue from producer (new chunk)."
            );
            processQueue();
          }
        }
      }
    }
  }, [
    messages,
    currentSpokenMessageId,
    voice,
    processQueue,
    setAudioQueue,
    isLoading,
  ]); // Added processQueue, setAudioQueue, isLoading

  return { stopAudioPlayback };
}
