import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; 
import { nextCookies } from "better-auth/next-js";
import { schema } from "@/db/schema";
 

const allowedOrigins = [
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '', 
];

if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

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
    server: {
        allowedOrigins: finalAllowedOrigins,
        trustProxy: true
    }
});
///implement more socials