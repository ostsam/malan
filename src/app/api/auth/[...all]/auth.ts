import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; 
import { nextCookies } from "better-auth/next-js";
import { user, session, account, verification } from "@/db/schema";
 
export const auth = betterAuth({
    appName: "Malan",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
          user,
          session,
          account,
          verification,
      }}),
      emailAndPassword: {
          enabled: true,
          autoSignIn: false,
        },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        redirectURI: "https://www.malan.vercel.app/dashboard",
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirectURI: "https://www.malan.vercel.app/dashboard",
      },
    },
    session: {
      modelName: "session",
      fields: {
        userId: "userId",
      },
      expiresIn: 604800, // 7 days
      updateAge: 86400, // 1 day
      disableSessionRefresh: true, // Disable session refresh so that the session is not updated regardless of the `updateAge` option. (default: `false`)
      additionalFields: {
        // Additional fields for the session table
        customField: {
          type: "string",
        },
      },
      storeSessionInDatabase: true, // Store session in database when secondary storage is provided (default: `false`)
      preserveSessionInDatabase: false, // Preserve session records in database when deleted from secondary storage (default: `false`)
      cookieCache: {
        enabled: true, // Enable caching session in cookie (default: `false`)
        maxAge: 300, // 5 minutes
      },
    },
    plugins: [nextCookies()],
  });
///implement more socials