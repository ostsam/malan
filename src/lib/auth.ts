import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; 
import { nextCookies } from "better-auth/next-js";
import { schema } from "@/db/schema";
 
export const auth = betterAuth({
    emailAndPassword: {  
        enabled: true},
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    plugins: [nextCookies()]
});
///implement more socials