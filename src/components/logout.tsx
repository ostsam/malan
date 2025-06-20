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
        <button className="cursor-pointer mt-3 flex flex-row items-center align-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleLogout}>
            Sign out
            <LogOutIcon className="h-4 w-4"/>
            </button>
    )
}