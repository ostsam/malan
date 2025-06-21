"use client";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";

export default function ChatHistory() {
    const router = useRouter();
    const handleChatHistoryClick = () => {
        router.push("/history");
    }
    return (
        <button className="flex flex-row cursor-pointer items-center gap-2 rounded-lg bg-sky-500 px-2 py-1 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleChatHistoryClick}>
            Chat history
            <History className="h-4 w-4"/>
            </button>
    )
}