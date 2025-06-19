"use server"

import { auth } from "@/lib/auth";

export const signIn = async (email: string, password: string) => {
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
}

export const signUp = async () => {
    await auth.api.signUpEmail({
    body: {
        email: "user@email.com",
        password: "password",
        name: "user"
    },
});
}
    