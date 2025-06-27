"use client"
import { authClient } from "@/lib/auth-client"; 
import { LogOutIcon } from "lucide-react";

export function LogoutButton() {
    const handleLogout = async () => {
        await authClient.signOut();
        window.location.href = '/'
    }

    return (
        <button 
        className="flex items-center justify-center py-3 gap-2 rounded-lg text-md font-medium text-gray-900 hover:bg-gray-100"            onClick={handleLogout}
        >
            Sign out
            <LogOutIcon className="h-4 w-4"/>
        </button>
    );
}