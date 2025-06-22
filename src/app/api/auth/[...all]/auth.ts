import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/schema";

const isProduction = process.env.NODE_ENV === 'production';
const appUrl = isProduction ? 'https://www.malan.vercel.app' : 'http://localhost:3000';

export const auth = betterAuth({
  appName: "Malan",
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    }
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      redirectURI: `${appUrl}/dashboard`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${appUrl}/dashboard`,
    },
  },
  session: {
    modelName: "session",
    fields: {
      userId: "userId",
    },
    expiresIn: 604800, // 7 days
    updateAge: 86400, // 1 day
    disableSessionRefresh: true,
    storeSessionInDatabase: true,
    preserveSessionInDatabase: false,
    cookie: {
      name: '__Secure-next-auth.session-token',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      domain: isProduction ? '.malan.vercel.app' : 'localhost',
      path: '/',
      sameSite: 'lax',
      secure: isProduction,
      httpOnly: true,
    },
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes
    },
  },
  plugins: [nextCookies()],
});