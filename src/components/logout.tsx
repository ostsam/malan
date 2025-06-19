
"use client"
import { authClient } from "@/lib/auth-client"; 
import { LogOut } from "lucide-react";

export default function Logout() {
    const handleLogout = async () => {
        await authClient.signOut();
    }
    return (
        <button className="mt-3 align-center inline-block rounded-lg bg-sky-500 px-6 py-4 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600" onClick={handleLogout}>Sign out</button>
    )
}