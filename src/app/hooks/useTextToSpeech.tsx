"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message } from "@ai-sdk/react";

async function generateSpeechAPI(
  text: string,
  voice: string,
  generation: number,
  generationRef: React.MutableRefObject<number>
): Promise<string | null> {
  if (!text.trim() || generation !== generationRef.current) return null;
  try {
    const response = await fetch("/api/chat/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });
    if (generation !== generationRef.current) return null;
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || "Failed to generate speech");
    }
    const blob = await response.blob();
    if (generation !== generationRef.current) return null;
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
}

function getDisplayText(content: string): string {
  if (!content.includes('"type":"text"')) {
    return content;
  }

  const textParts = [];
  const key = '"text":"';
  let startIndex = content.indexOf(key);

  while (startIndex !== -1) {
    const valueStartIndex = startIndex + key.length;
    let valueEndIndex = -1;
    let i = valueStartIndex;
    while (i < content.length) {
      if (content[i] === '"') {
        if (i > 0 && content[i - 1] === '\\') {
          i++;
          continue;
        }
        valueEndIndex = i;
        break;
      }
      i++;
    }

    let rawText;
    if (valueEndIndex !== -1) {
      rawText = content.substring(valueStartIndex, valueEndIndex);
    } else {
      rawText = content.substring(valueStartIndex);
    }

    try {
      textParts.push(JSON.parse(`"${rawText}"`));
    } catch {
      textParts.push(rawText);
    }

    startIndex = content.indexOf(key, valueStartIndex);
  }

  return textParts.join("");
}

interface UseTextToSpeechProps {
  messages: Message[];
  isLoading: boolean;
  voice?: string;
}

export interface AudioQueueItem {
  url: string;
  textFragment: string;
  pauseAfterMs: number;
}

export function useTextToSpeech({
  messages,
  isLoading,
  voice = "nova",
}: UseTextToSpeechProps): {
  stopAudioPlayback: () => void;
  speak: (text: string) => void;
} {
  const [audioQueue, setAudioQueue] = useState<AudioQueueItem[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSpokenMessageId, setCurrentSpokenMessageId] = useState<string | null>(null);

  const textBufferRef = useRef("");
  const processedContentRef = useRef("");
  const isProcessingAudioRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);

  const stopAudioPlayback = useCallback(() => {
    console.log("TTS: Stop audio playback requested.");
    generationRef.current++; // Invalidate current generation

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
    textBufferRef.current = "";
    isProcessingAudioRef.current = false;
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingAudioRef.current) return;
    isProcessingAudioRef.current = true;

    const generation = generationRef.current;

    try {
      let textToProcess = "";
      const buffer = textBufferRef.current;

      if (!isLoading) {
        textToProcess = buffer;
        textBufferRef.current = "";
      } else {
        const lastPeriod = buffer.lastIndexOf(". ");
        const lastQuestion = buffer.lastIndexOf("? ");
        const lastExclamation = buffer.lastIndexOf("! ");
        const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

        if (lastSentenceEnd !== -1) {
          textToProcess = buffer.substring(0, lastSentenceEnd + 1);
          textBufferRef.current = buffer.substring(lastSentenceEnd + 2);
        }
      }

      if (textToProcess.trim()) {
        const sentences = textToProcess.match(/[^.!?]+[.!?]*/g) || [];
        for (const sentence of sentences) {
          if (generation !== generationRef.current) break;
          const trimmedSentence = sentence.trim();
          if (trimmedSentence) {
            console.log("TTS: Generating for sentence:", trimmedSentence);
            const audioUrl = await generateSpeechAPI(
              trimmedSentence,
              voice,
              generation,
              generationRef
            );
            if (audioUrl && generation === generationRef.current) {
              const pauseAfterMs = 150; // Pause for natural cadence
              console.log(`TTS: Queuing audio for '${trimmedSentence}', pause: ${pauseAfterMs}ms`);
              setAudioQueue((prev) => [
                ...prev,
                { url: audioUrl, textFragment: trimmedSentence, pauseAfterMs },
              ]);
            } else if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
            }
          }
        }
      }
    } catch (error) {
      console.error("TTS: Error in processQueue:", error);
    } finally {
      isProcessingAudioRef.current = false;
      if (generation === generationRef.current && textBufferRef.current && !isLoading) {
        console.log("TTS: Re-triggering processQueue from finally for remaining text.");
        processQueue();
      }
    }
  }, [isLoading, voice]);

  // Player: play audio from the queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio) {
      const currentAudioItem = audioQueue[0];
      setIsPlayingAudio(true);
      console.log("TTS: Playing audio for:", currentAudioItem.textFragment);

      const audio = new Audio(currentAudioItem.url);
      audioPlayerRef.current = audio;

      const cleanupAndProceed = (itemToClean: AudioQueueItem) => {
        URL.revokeObjectURL(itemToClean.url);
        if (audioPlayerRef.current === audio) audioPlayerRef.current = null;

        const proceed = () => {
          setAudioQueue((prev) => prev.slice(1));
          setIsPlayingAudio(false);
        };

        if (itemToClean.pauseAfterMs > 0) {
          console.log(`TTS: Pausing for ${itemToClean.pauseAfterMs}ms`);
          setTimeout(proceed, itemToClean.pauseAfterMs);
        } else {
          proceed();
        }
      };

      audio.play().catch((e) => {
        console.error("Audio playback failed:", e, currentAudioItem.textFragment);
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
  }, [audioQueue, isPlayingAudio]);

  // Producer: monitors messages and populates the text buffer
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === "assistant") {
      const newContent = getDisplayText(lastMessage.content);

      if (lastMessage.id !== currentSpokenMessageId) {
        // New message, reset everything
        stopAudioPlayback();
        generationRef.current++;
        console.log(`TTS: New message ID: ${lastMessage.id}. Resetting.`);
        setCurrentSpokenMessageId(lastMessage.id);
        textBufferRef.current = newContent;
        processedContentRef.current = newContent;
        if (!isProcessingAudioRef.current) {
          processQueue();
        }
      } else if (newContent.length > processedContentRef.current.length) {
        // Streaming update to the current message
        const newTextChunk = newContent.substring(
          processedContentRef.current.length
        );
        if (newTextChunk) {
          textBufferRef.current += newTextChunk;
          processedContentRef.current = newContent;
          if (!isProcessingAudioRef.current) {
            processQueue();
          }
        }
      }
    }
  }, [messages, currentSpokenMessageId, processQueue, stopAudioPlayback]);

  // Effect to process remaining buffer when loading is finished
  useEffect(() => {
    if (!isLoading && textBufferRef.current.trim() && !isProcessingAudioRef.current) {
      console.log("TTS: Loading finished, processing remaining buffer.");
      processQueue();
    }
  }, [isLoading, processQueue]);

  const speak = useCallback(
    async (text: string) => {
      console.log("TTS: Manual speak triggered.");
      stopAudioPlayback();

      const generation = generationRef.current + 1;
      generationRef.current = generation;

      try {
        const sentences = text.match(/[^.!?]+[.!?]*/g) || [];
        for (const sentence of sentences) {
          if (generation !== generationRef.current) {
            console.log("TTS (speak): Generation changed, aborting.");
            break;
          }
          const trimmedSentence = sentence.trim();
          if (trimmedSentence) {
            const audioUrl = await generateSpeechAPI(
              trimmedSentence,
              voice,
              generation,
              generationRef
            );
            if (audioUrl && generation === generationRef.current) {
              const pauseAfterMs = 150;
              setAudioQueue((prev) => [
                ...prev,
                { url: audioUrl, textFragment: trimmedSentence, pauseAfterMs },
              ]);
            } else if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
            }
          }
        }
      } catch (error) {
        console.error("TTS (speak): Error in speak function:", error);
      }
    },
    [stopAudioPlayback, voice]
  );

  return { stopAudioPlayback, speak };
}
