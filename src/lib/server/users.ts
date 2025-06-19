"use server"

import { auth } from "@/lib/auth";
import { Toaster } from "sonner";

export const signIn = async (email: string, password: string) => {
    try {
    await auth.api.signInEmail({
    body: {
        email,
        password
    },
}); 
return {
    success: true,
    message: "User signed in successfully"
}
} catch (error) {
    return {
        success: false,
        message: "Signin error occurred"
    }
}
}

export const signUp = async (email: string, username: string, password: string) => {
    try {
    await auth.api.signUpEmail({
    body: {
        email,
        name: username,
        password,
    },
});
return {
    success: true,
    message: "User signed up successfully"
}
} catch (error) {
    return {
        success: false,
        message: "Signup error occurred"
    }
}
}
    