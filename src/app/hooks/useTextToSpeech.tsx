"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message } from "@ai-sdk/react";

async function generateSpeechAPI(
  text: string,
  voice: string,
  generation: number,
  generationRef: React.MutableRefObject<number>
): Promise<{ urls: string[]; format: string } | null> {
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
    
    // Parse the JSON response with base64encoded chunks
    const data = await response.json();
    if (!data.chunks || !Array.isArray(data.chunks)) {
      throw new Error("Invalid response format: missing chunks array");
    }
    
    const format = data.format || "opus";
    
    // Convert base64 chunks to blob URLs
    const audioUrls: string[] = [];
    for (const base64Chunk of data.chunks) {
      if (generation !== generationRef.current) {
        // Clean up any URLs we've already created
        audioUrls.forEach(url => URL.revokeObjectURL(url));
        return null;
      }
      
      // Convert base64 to blob
      const binaryString = atob(base64Chunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use correct MIME type - OpenAI's "opus" format is actually Ogg-encapsulated Opus
      const mimeType = format === "mp3" ? "audio/mpeg" : "audio/ogg";
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      audioUrls.push(url);
    }
    
    if (generation !== generationRef.current) {
      // Clean up URLs if generation changed
      audioUrls.forEach(url => URL.revokeObjectURL(url));
      return null;
    }
    
    return { urls: audioUrls, format };
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
}

function getDisplayText(content: string): string {
  // TTS needs clean, plain text without any tokenization artifacts
  // The key insight is that tokenization creates structured content that corrupts TTS
  
  // If it's already plain text, return it
  if (typeof content === "string" && 
      !content.includes('"type":"text"') && 
      !content.includes("React.createElement") &&
      !content.includes("$$typeof") &&
      !content.includes("children")) {
    return content;
  }

  // Handle AI SDK streaming format with text parts
  if (content.includes('"type":"text"')) {
    const textParts = [];
    const key = '"text":"';
    let startIndex = content.indexOf(key);

    while (startIndex !== -1) {
      const valueStartIndex = startIndex + key.length;
      let valueEndIndex = -1;
      let i = valueStartIndex;
      while (i < content.length) {
        if (content[i] === '"') {
          if (i > 0 && content[i - 1] === "\\") {
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

  // Extract text from React/JSX structures created by tokenization
  // This is the key fix - the tokenizer creates React elements that corrupt TTS
  if (content.includes("React.createElement") || content.includes("$$typeof")) {
    // Try to extract just the text content from React elements
    const textMatches = content.match(/"children":\s*"([^"\\]*(\\.[^"\\]*)*)"/g);
    if (textMatches) {
      return textMatches.map(match => {
        const textContent = match.match(/"children":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
        if (textContent) {
          try {
            return JSON.parse(`"${textContent[1]}"`);
          } catch {
            return textContent[1];
          }
        }
        return '';
      }).join('');
    }
  }

  // More aggressive cleanup for corrupted content
  let cleaned = content;
  
  // Remove React-specific artifacts
  cleaned = cleaned.replace(/\$\$typeof:.*?,/g, '');
  cleaned = cleaned.replace(/type:\s*"[^"]*",/g, '');
  cleaned = cleaned.replace(/key:\s*[^,]*,/g, '');
  cleaned = cleaned.replace(/ref:\s*[^,]*,/g, '');
  cleaned = cleaned.replace(/props:\s*\{[^}]*\},/g, '');
  
  // Remove JSON-like structures
  cleaned = cleaned.replace(/\{[^{}]*\}/g, '');
  cleaned = cleaned.replace(/\[[^\[\]]*\]/g, '');
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Extract text content including non-Latin characters (CJK, etc.)
  const textOnlyMatch = cleaned.match(/[\p{L}\p{N}\s.,!?;:'"()-]+/gu);
  if (textOnlyMatch) {
    return textOnlyMatch.join(' ').replace(/\s+/g, ' ').trim();
  }
  
  // Final fallback
  return cleaned.trim();
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
  format?: string;
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
  const [currentSpokenMessageId, setCurrentSpokenMessageId] = useState<
    string | null
  >(null);

  const textBufferRef = useRef("");
  const processedContentRef = useRef("");
  const isProcessingAudioRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);

  const stopAudioPlayback = useCallback(() => {
    // console.log("TTS: Stop audio playback requested.");
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
    let didProcessSomething = false;

    try {
      let textToProcess = "";
      const buffer = textBufferRef.current;

      if (!isLoading) {
        // When not loading, process all remaining text
        textToProcess = buffer;
        textBufferRef.current = "";
      } else {
        // When loading, try to process complete sentences
        const lastPeriod = buffer.lastIndexOf(". ");
        const lastQuestion = buffer.lastIndexOf("? ");
        const lastExclamation = buffer.lastIndexOf("! ");
        const lastArabicQuestion = buffer.lastIndexOf("؟ ");
        const lastArabicPeriod = buffer.lastIndexOf("۔ ");
        const lastSentenceEnd = Math.max(
          lastPeriod,
          lastQuestion,
          lastExclamation,
          lastArabicQuestion,
          lastArabicPeriod
        );

        if (lastSentenceEnd !== -1) {
          textToProcess = buffer.substring(0, lastSentenceEnd + 1);
          textBufferRef.current = buffer.substring(lastSentenceEnd + 2);
        } else {
          // If no sentence boundary found, check if we have enough text to process
          // Process text if it's longer than 50 characters or contains a comma
          const hasComma = buffer.includes(", ");
          const hasEnoughText = buffer.length > 50;
          
          if (hasComma || hasEnoughText) {
            // Find the last comma or natural break point
            const lastComma = buffer.lastIndexOf(", ");
            const breakPoint = lastComma !== -1 ? lastComma + 1 : Math.floor(buffer.length * 0.8);
            
            textToProcess = buffer.substring(0, breakPoint);
            textBufferRef.current = buffer.substring(breakPoint);
          }
        }
      }

      if (textToProcess.trim()) {
        didProcessSomething = true;
        // Improved sentence splitting with better regex including Arabic punctuation
        const sentences =
          textToProcess.match(/[^.!?。！？؟۔\n]+[.!?。！？؟۔\n]*/g) || [];
        
        
        for (const sentence of sentences) {
          if (generation !== generationRef.current) break;
          const trimmedSentence = sentence.trim();
          if (trimmedSentence) {
            // console.log("TTS: Generating for sentence:", trimmedSentence);
            const audioResult = await generateSpeechAPI(
              trimmedSentence,
              voice,
              generation,
              generationRef
            );
            if (audioResult && generation === generationRef.current) {
              const pauseAfterMs = 180; // Pause for natural cadence
              
              
              // Create individual queue items for each audio chunk
              audioResult.urls.forEach((url, index) => {
                const isLastChunk = index === audioResult.urls.length - 1;
                setAudioQueue((prev) => [
                  ...prev,
                  { 
                    url, 
                    textFragment: `${trimmedSentence}${index > 0 ? ` (part ${index + 1})` : ''}`, 
                    pauseAfterMs: isLastChunk ? pauseAfterMs : 50, // Short pause between chunks, longer after sentence
                    format: audioResult.format 
                  },
                ]);
              });
            } else if (audioResult) {
              audioResult.urls.forEach(url => URL.revokeObjectURL(url));
            }
          }
        }
      }
    } catch (error) {
      console.error("TTS: Error in processQueue:", error);
    } finally {
      isProcessingAudioRef.current = false;
      // If we processed a chunk and there's more text in the buffer,
      // schedule another run. This makes the processing "greedy".
      if (
        didProcessSomething &&
        generation === generationRef.current &&
        textBufferRef.current.trim()
      ) {
        // console.log(
        //   "TTS: Re-triggering processQueue for remaining buffered text."
        // );
        processQueue();
      }
    }
  }, [isLoading, voice]);

  // Player: play audio from the queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio) {
      const currentAudioItem = audioQueue[0];
      
      
      setIsPlayingAudio(true);
      

      const audio = new Audio(currentAudioItem.url);
      audioPlayerRef.current = audio;

      const cleanupAndProceed = () => {
        if (audioPlayerRef.current === audio) audioPlayerRef.current = null;

        // Move to next item
        const proceed = () => {
          // Clean up URL for the current item
          URL.revokeObjectURL(currentAudioItem.url);
          setAudioQueue((prev) => prev.slice(1));
          setIsPlayingAudio(false);
        };

        // Smart pause: subtract time already spent waiting for next chunk
        const audioEndTime = Date.now();
        const queueLength = audioQueue.length;
        
        if (currentAudioItem.pauseAfterMs > 0 && queueLength > 1) {
          // Next chunk is ready, use normal pause
          setTimeout(proceed, currentAudioItem.pauseAfterMs);
        } else if (currentAudioItem.pauseAfterMs > 0) {
          // No next chunk ready, start counting time and check periodically
          const targetPause = currentAudioItem.pauseAfterMs;
          const startWaitTime = Date.now();
          
          const checkAndProceed = () => {
            const waitedTime = Date.now() - startWaitTime;
            const remainingPause = Math.max(0, targetPause - waitedTime);
            
            if (audioQueue.length > 1) {
              // Next chunk arrived, proceed with remaining pause
              setTimeout(proceed, remainingPause);
            } else if (waitedTime >= targetPause) {
              // Full pause time elapsed, proceed anyway
              proceed();
            } else {
              // Keep waiting
              setTimeout(checkAndProceed, 50);
            }
          };
          
          checkAndProceed();
        } else {
          proceed();
        }
      };

      // Wait for audio to be ready before playing to prevent garbling
      audio.addEventListener('canplaythrough', () => {
        if (audioPlayerRef.current === audio) {
          audio.play().catch((e) => {
            console.error("Audio playback failed:", e, currentAudioItem.textFragment);
            cleanupAndProceed();
          });
        }
      });

      // Fallback: try to play immediately if canplaythrough doesn't fire
      setTimeout(() => {
        if (audioPlayerRef.current === audio && audio.readyState >= 2) {
          audio.play().catch((e) => {
            console.error("Audio playback failed (fallback):", e, currentAudioItem.textFragment);
            cleanupAndProceed();
          });
        }
      }, 100);

      audio.onended = () => {
        // console.log("TTS: Audio ended for:", currentAudioItem.textFragment);
        cleanupAndProceed();
      };
      audio.onerror = (e) => {
        console.error("Error playing audio:", e, currentAudioItem.textFragment);
        cleanupAndProceed();
      };
    }
  }, [audioQueue, isPlayingAudio]);

  // Producer: monitors messages and populates the text buffer
  useEffect(() => {
    // Find all assistant messages that haven't been processed yet
    const assistantMessages = messages.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) return;
    
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    const rawContent = lastMessage.content;
    
          // Always use text extraction, but check if Arabic extraction is working properly
      const newContent = getDisplayText(rawContent);
    
    if (lastMessage.id !== currentSpokenMessageId) {
      // New message or different message, reset everything
      stopAudioPlayback();
      generationRef.current++;
              // console.log(`TTS: Processing message ID: ${lastMessage.id}. Total assistant messages: ${assistantMessages.length}`);
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
  }, [messages, currentSpokenMessageId, processQueue, stopAudioPlayback]);

  // Effect to handle initial load of older chats with assistant messages
  useEffect(() => {
    // If we have messages but no current spoken message ID, this might be an initial load
    if (messages.length > 0 && !currentSpokenMessageId && !isLoading) {
      const assistantMessages = messages.filter(msg => msg.role === "assistant");
      if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        // console.log(`TTS: Initial load detected. Processing last assistant message: ${lastAssistantMessage.id}`);
        
        // Trigger processing of the last assistant message
        const rawContent = lastAssistantMessage.content;
        const newContent = getDisplayText(rawContent);
        
        if (newContent.trim()) {
          stopAudioPlayback();
          generationRef.current++;
          setCurrentSpokenMessageId(lastAssistantMessage.id);
          textBufferRef.current = newContent;
          processedContentRef.current = newContent;
          if (!isProcessingAudioRef.current) {
            processQueue();
          }
        }
      }
    }
  }, [messages, currentSpokenMessageId, isLoading, processQueue, stopAudioPlayback]);

  // Effect to ensure TTS starts for any assistant message when not loading
  useEffect(() => {
    // If we're not loading and have assistant messages but no audio is playing, start TTS
    if (!isLoading && !isPlayingAudio && audioQueue.length === 0) {
      const assistantMessages = messages.filter(msg => msg.role === "assistant");
      if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        
        // Only process if this message hasn't been processed yet
        if (lastAssistantMessage.id !== currentSpokenMessageId) {
          // console.log(`TTS: Auto-starting for assistant message: ${lastAssistantMessage.id}`);
          
          const rawContent = lastAssistantMessage.content;
          const newContent = getDisplayText(rawContent);
          
          if (newContent.trim()) {
            stopAudioPlayback();
            generationRef.current++;
            setCurrentSpokenMessageId(lastAssistantMessage.id);
            textBufferRef.current = newContent;
            processedContentRef.current = newContent;
            if (!isProcessingAudioRef.current) {
              processQueue();
            }
          }
        }
      }
    }
  }, [messages, isLoading, isPlayingAudio, audioQueue.length, currentSpokenMessageId, processQueue, stopAudioPlayback]);

  // Effect to process remaining buffer when loading is finished
  useEffect(() => {
    if (
      !isLoading &&
      textBufferRef.current.trim() &&
      !isProcessingAudioRef.current
    ) {
      // console.log("TTS: Loading finished, processing remaining buffer.");
      // Force process all remaining text when loading finishes
      const remainingText = textBufferRef.current.trim();
      if (remainingText) {
        // console.log("TTS: Processing remaining text when loading finished:", remainingText.substring(0, 100) + (remainingText.length > 100 ? "..." : ""));
        // Process the remaining text as a single sentence
        const audioResult = generateSpeechAPI(
          remainingText,
          voice,
          generationRef.current,
          generationRef
        ).then(result => {
          const currentGeneration = generationRef.current;
          if (result && currentGeneration === generationRef.current) {
            const pauseAfterMs = 180;
            result.urls.forEach((url, index) => {
              const isLastChunk = index === result.urls.length - 1;
              setAudioQueue((prev) => [
                ...prev,
                { 
                  url, 
                  textFragment: `${remainingText}${index > 0 ? ` (part ${index + 1})` : ''}`, 
                  pauseAfterMs: isLastChunk ? pauseAfterMs : 50,
                  format: result.format 
                },
              ]);
            });
          } else if (result) {
            result.urls.forEach(url => URL.revokeObjectURL(url));
          }
        }).catch(error => {
          console.error("TTS: Error processing remaining text:", error);
        });
      }
      textBufferRef.current = "";
    }
  }, [isLoading, voice]);

  const speak = useCallback(
    async (text: string) => {
      // console.log("TTS: Manual speak triggered.");
      stopAudioPlayback();

      const generation = generationRef.current + 1;
      generationRef.current = generation;

      try {
        const sentences = text.match(/[^.!?。！？\n]+[.!?。！？\n]*/g) || [];
        for (const sentence of sentences) {
          if (generation !== generationRef.current) {
            // console.log("TTS (speak): Generation changed, aborting.");
            break;
          }
          const trimmedSentence = sentence.trim();
          if (trimmedSentence) {
            const audioResult = await generateSpeechAPI(
              trimmedSentence,
              voice,
              generation,
              generationRef
            );
            if (audioResult && generation === generationRef.current) {
              const pauseAfterMs = 150;
              // Create individual queue items for each audio chunk
              audioResult.urls.forEach((url, index) => {
                const isLastChunk = index === audioResult.urls.length - 1;
                setAudioQueue((prev) => [
                  ...prev,
                  { 
                    url, 
                    textFragment: `${trimmedSentence}${index > 0 ? ` (part ${index + 1})` : ''}`, 
                    pauseAfterMs: isLastChunk ? pauseAfterMs : 50, // Short pause between chunks, longer after sentence
                    format: audioResult.format 
                  },
                ]);
              });
            } else if (audioResult) {
              audioResult.urls.forEach(url => URL.revokeObjectURL(url));
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
