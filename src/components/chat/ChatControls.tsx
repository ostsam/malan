import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Switch from "react-switch";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { useInputControls } from "@/app/hooks/useInputControls";
import { interfaceColor } from "@/lib/theme";
import { ChineseScriptToggle } from "@/components/chinese-script-toggle";

// Dynamically import the player so it only loads in the browser.
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  {
    ssr: false,
    loading: () => null,
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
  selectedLanguage?: string;
  onScriptChange?: (script: "traditional" | "simplified") => void;
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
  selectedLanguage,
  onScriptChange,
}: ChatControlsProps) {
  const dotLottiePlayerRef = useRef<DotLottie>(null);

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

  useEffect(() => {
    const player = dotLottiePlayerRef.current;
    if (player) {
      if (isRecording) {
        player.play();
      } else {
        player.stop();
      }
    }
  }, [isRecording]);

  const getMicCaption = () => {
    if (status === "submitted") return "Processing Speech";
    if (isRecording) return "Recording";
    return "Press to Record";
  };

  return (
    <div className="relative flex items-center justify-center bg-white dark:bg-black border-t border-gray-300 dark:border-zinc-800 fade-in delay-2">
      {/* Top row: switches */}
      <div className="absolute left-1 right-1 top-1 flex justify-between items-start w-[calc(100%-0.5rem)] pointer-events-none">
        <div className="flex flex-col items-center pointer-events-auto">
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
            className="mt-1 text-xs text-center text-gray-900 dark:text-gray-300 w-24 whitespace-normal"
          >
            {isMobile
              ? pushToTalk
                ? "Hold Mic to Talk"
                : "Tap Mic to Toggle"
              : pushToTalk
                ? "Hold Shift+Z to Talk"
                : "Toggle Shift+Z"}
          </label>
        </div>

        <div className="flex flex-col items-center pointer-events-auto">
          {selectedLanguage === "zh" && (
            <ChineseScriptToggle
              className="text-xs"
              onScriptChange={onScriptChange}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center">
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
              : "cursor-pointer"
          }`}
        >
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
        </div>
        <p className="text-md text-gray-600 dark:text-gray-400 mb-1">
          {getMicCaption()}
        </p>
      </div>
    </div>
  );
}
