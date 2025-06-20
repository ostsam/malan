"use client"
import { authClient } from "@/lib/auth-client"; 
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Logout() {
    const router = useRouter();
    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/");
    }
    return (
        <button className="flex items-center gap-3 mt-3 rounded-lg bg-sky-500 px-3 py-2 font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleLogout}>Sign out
        <LogOutIcon className="w-4 h-4" />
        </button>
    )
}