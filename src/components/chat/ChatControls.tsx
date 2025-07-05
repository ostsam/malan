import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Switch from "react-switch";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { useInputControls } from "@/app/hooks/useInputControls";
import { interfaceColor } from "@/lib/theme";

// OPTIMIZATION: Preload the Lottie component with better loading strategy
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  {
    ssr: false,
    loading: () => (
      <div className="w-25 h-25 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex items-center justify-center">
        <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      </div>
    ),
  }
);

interface ChatControlsProps {
  isRecording: boolean;
  isTranscribing: boolean;
  status: string;
  pushToTalk: boolean;
  setPushToTalk: (value: boolean) => void;
  startRecording: () => void;
  stopRecording: () => void;
  stopAudioPlayback: () => void;
}

export function ChatControls({
  isRecording,
  isTranscribing,
  status,
  pushToTalk,
  setPushToTalk,
  startRecording,
  stopRecording,
  stopAudioPlayback,
}: ChatControlsProps) {
  const dotLottiePlayerRef = useRef<DotLottie>(null);
  const [isLottieLoaded, setIsLottieLoaded] = useState(false);

  const {
    isMobile,
    handleMicInteractionStart,
    handleMicInteractionEnd,
    handleMicClick,
  } = useInputControls({
    isRecording,
    isTranscribing,
    status,
    startRecording,
    stopRecording,
    stopAudioPlayback,
  });

  // OPTIMIZATION: Preload the Lottie animation
  useEffect(() => {
    const preloadLottie = async () => {
      try {
        const response = await fetch("/microphonebutton.json");
        if (response.ok) {
          setIsLottieLoaded(true);
        }
      } catch (error) {
        console.warn("Failed to preload Lottie animation:", error);
      }
    };
    preloadLottie();
  }, []);

  useEffect(() => {
    const player = dotLottiePlayerRef.current;
    if (player && isLottieLoaded) {
      if (isRecording) {
        player.play();
      } else {
        player.stop();
      }
    }
  }, [isRecording, isLottieLoaded]);

  const getMicCaption = () => {
    if (status === "submitted") return "Processing Speech";
    if (isRecording) return "Recording";
    return "Press to Record";
  };

  const getSwitchLabel = () => {
    if (isMobile) {
      return pushToTalk ? "Hold Mic to Talk" : "Tap Mic to Toggle";
    } else {
      return pushToTalk ? "Hold Shift+Z to Talk" : "Toggle Shift+Z";
    }
  };

  return (
    <div className="relative flex items-center justify-center bg-white dark:bg-black border-t border-gray-300 dark:border-zinc-800 fade-in delay-2 py-4 px-2 min-h-[140px]">
      {/* Push-to-talk toggle - Left side, vertically centered */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
        <Switch
          id="push-to-talk-toggle"
          checked={pushToTalk}
          onChange={() => setPushToTalk(!pushToTalk)}
          checkedIcon={false}
          uncheckedIcon={false}
          onColor={interfaceColor}
          height={20}
          width={40}
        />
        <label
          htmlFor="push-to-talk-toggle"
          className="mt-1 text-xs text-center text-gray-900 dark:text-gray-300 w-32 whitespace-normal leading-tight"
        >
          {getSwitchLabel()}
        </label>
      </div>

      {/* Microphone button - Centered */}
      <div className="flex flex-col items-center justify-center flex-1">
        <div
          onMouseDown={handleMicInteractionStart}
          onMouseUp={handleMicInteractionEnd}
          onTouchStart={handleMicInteractionStart}
          onTouchEnd={handleMicInteractionEnd}
          onClick={handleMicClick}
          role="button"
          tabIndex={0}
          aria-pressed={isRecording}
          className={`${
            isTranscribing || status === "submitted"
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:scale-105 transition-transform duration-200"
          } flex items-center justify-center`}
        >
          {isLottieLoaded ? (
            <DotLottieReact
              dotLottieRefCallback={(playerInstance) => {
                dotLottiePlayerRef.current = playerInstance;
              }}
              src="/microphonebutton.json"
              loop={true}
              autoplay={false}
              className={`w-25 h-25 pointer-events-none ${
                isTranscribing || status === "submitted" ? "opacity-50" : ""
              }`}
            />
          ) : (
            // Fallback loading state
            <div className="w-25 h-25 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center px-2">
          {getMicCaption()}
        </p>
      </div>
    </div>
  );
}
