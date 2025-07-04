import { useState } from "react";

export function useChatErrors() {
  const [uiError, setUiError] = useState<string | null>(null);

  const showError = (message: string, duration: number = 5000) => {
    setUiError(message);
    setTimeout(() => setUiError(null), duration);
  };

  const clearError = () => setUiError(null);

  return {
    uiError,
    showError,
    clearError,
  };
}
