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
        <button className="flex flex-row cursor-pointer items-center gap-2 rounded-lg bg-sky-500 px-2 py-1 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleLogout}>
            Sign out
            <LogOutIcon className="h-4 w-4"/>
            </button>
    )
}