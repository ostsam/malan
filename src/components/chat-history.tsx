"use client";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";

export default function ChatHistory() {
    const router = useRouter();
    const handleClick = () => {
        router.push("/history");
    }
    return (
        <button className="cursor-pointer mt-3 flex flex-row items-center align-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleClick}>
            Chat history
            <History className="h-4 w-4"/>
            </button>
    )
}