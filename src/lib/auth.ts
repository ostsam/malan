import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; 
import { nextCookies } from "better-auth/next-js";
import { schema } from "@/db/schema";
 
// Define allowed origins
const allowedOrigins = [
    // Your local development URL - PLEASE VERIFY THIS PORT
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '', 
];

// Add Vercel deployment URLs if on Vercel
// VERCEL_URL will contain the hostname of the deployment (e.g., my-site.vercel.app or my-site-git-branch.vercel.app)
if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

// Add the auth service's own URL if it's defined and different (e.g., your production custom domain)
// This might be the same as VERCEL_URL in production but could be different if you have a custom domain
// not yet reflected by VERCEL_URL during build, or if NEXT_PUBLIC_BETTER_AUTH_URL is set to a custom domain.
if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    const authServiceUrl = new URL(process.env.NEXT_PUBLIC_BETTER_AUTH_URL).origin;
    if (!allowedOrigins.includes(authServiceUrl)) {
        allowedOrigins.push(authServiceUrl);
    }
}

// Filter out any empty strings that might have resulted from conditional additions
const finalAllowedOrigins = allowedOrigins.filter(Boolean);

console.log("[auth.ts] Configuring better-auth with allowed origins:", finalAllowedOrigins);

export const auth = betterAuth({
    emailAndPassword: {  
        enabled: true
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    plugins: [nextCookies()],
    // Configure allowed origins for the server
    // The exact option name and structure might differ for 'better-auth'.
    // Common patterns are `server.allowedOrigins`, `cors.origin`, or `allowedOrigins` directly.
    // Consulting better-auth documentation is advised if this specific structure fails.
    server: {
        allowedOrigins: finalAllowedOrigins,
        // It's also common to need to set trustProxy if behind a proxy like Vercel
        trustProxy: true // Recommended when deployed behind a reverse proxy
    }
});
///implement more socials