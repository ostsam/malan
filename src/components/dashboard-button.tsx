"use client"
import { ArrowLeft, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardButton() {
    const router = useRouter();
    const handleDashboard = async () => {
        router.push("/dashboard");
    }
    return (
        <button className="flex flex-row cursor-pointer items-center gap-2 rounded-lg bg-sky-500 px-2 py-1 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleDashboard}>
            <ArrowLeft className="h-4 w-4"/>
            Dashboard
            </button>
    )
}