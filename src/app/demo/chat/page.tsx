"use client";

import { useRouter } from "next/navigation";
import { ChatSession, DemoSettings } from "@/components/chat/ChatSession";

export default function DemoChatPage() {
  const router = useRouter();

  // Get demo settings from URL params or localStorage
  const getDemoSettings = (): DemoSettings | null => {
    if (typeof window === "undefined") return null;

    const stored = sessionStorage.getItem("demoSettings");
    if (stored) {
      return JSON.parse(stored);
    }

    // Fallback to URL params if sessionStorage is empty
    const urlParams = new URLSearchParams(window.location.search);
    const settings: DemoSettings = {
      nativeLanguage: urlParams.get("nativeLanguage") || "en",
      nativeLanguageLabel: urlParams.get("nativeLanguageLabel") || "English",
      selectedLanguage: urlParams.get("selectedLanguage") || "es",
      selectedLanguageLabel:
        urlParams.get("selectedLanguageLabel") || "Spanish",
      selectedLevel: urlParams.get("selectedLevel") || "beginner",
      interlocutor: urlParams.get("interlocutor") || "Sofía",
      isDemo: true,
    };

    // Store in sessionStorage for persistence
    sessionStorage.setItem("demoSettings", JSON.stringify(settings));
    return settings;
  };

  // Check if demo limit has been reached
  const isDemoLimitReached = (): boolean => {
    if (typeof window === "undefined") return false;
    const messageCount = localStorage.getItem("demoMessageCount");
    return messageCount ? parseInt(messageCount) >= 6 : false;
  };

  const demoSettings = getDemoSettings();

  if (!demoSettings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Demo settings not found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please start the demo from the dashboard.
          </p>
        </div>
      </div>
    );
  }

  // If demo limit is reached, show signup prompt immediately
  if (isDemoLimitReached()) {
    return (
      <div className="flex flex-col w-full max-w-xl mx-auto h-screen text-lg bg-white dark:bg-black overflow-hidden font-inter">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Demo Limit Reached</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You've reached the demo limit. Sign up now to continue your
              conversation with {demoSettings.interlocutor} and unlock unlimited
              learning.
            </p>
            <button
              onClick={() => {
                // Store demo data for recovery after signup
                const demoData = {
                  settings: demoSettings,
                  messages: [], // Will be populated by the demo chat
                  createdAt: new Date().toISOString(),
                };
                localStorage.setItem("demoChatData", JSON.stringify(demoData));

                // Navigate to signup with demo flag
                router.push("/signup?demo=true");
              }}
              className="bg-[#3C18D9] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a0f9e] transition-colors"
            >
              Sign up to continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSignupPrompt = () => {
    // Store demo data for recovery after signup
    const demoData = {
      settings: demoSettings,
      messages: [], // Will be populated by the demo chat
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("demoChatData", JSON.stringify(demoData));

    // Navigate to signup with demo flag
    router.push("/signup?demo=true");
  };

  return (
    <ChatSession
      demoMode={true}
      demoSettings={demoSettings}
      messageLimit={6}
      onSignupPrompt={handleSignupPrompt}
    />
  );
}
