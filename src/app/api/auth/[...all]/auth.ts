import { authClient } from "@/lib/auth-client";
import { useState } from "react";

const [email, setEmail] = useState("")
const [password, setPassword] = useState("");
const [name, setName] = useState("");

const { data, error } = await authClient.signUp.email({
        email, 
        password, 
        name, 
        callbackURL: "/dashboard" 
    }, {
        onRequest: (ctx) => {
            //show loading
        },
        onSuccess: (ctx) => {
            //redirect to the dashboard or sign in page
        },
        onError: (ctx) => {
            alert(ctx.error.message);
        },
});