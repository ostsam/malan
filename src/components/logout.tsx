"use client";
import { authClient } from "@/lib/auth-client";
import { LogOutIcon } from "lucide-react";

export function LogoutButton() {
  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex justify-center w-full">
      <button
        className="flex items-center justify-center py-3 px-6 gap-2 rounded-lg text-md font-medium text-slate-700 dark:text-slate-300 hover:bg-[rgba(23,6,100,0.08)] dark:hover:bg-[rgba(23,6,100,0.15)] transition-colors duration-200 w-full max-w-xs cursor-pointer"
        onClick={handleLogout}
      >
        Sign out
        <LogOutIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
