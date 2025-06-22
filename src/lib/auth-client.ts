import { createAuthClient } from "better-auth/react";

const isProduction = process.env.NODE_ENV === 'production';
const baseURL = isProduction 
  ? 'https://www.malan.vercel.app/api/auth' 
  : 'http://localhost:3000/api/auth';

export const authClient = createAuthClient({
  baseURL,
  credentials: 'include', // Important for cookies to be sent with requests
  withCredentials: true, // Important for CORS requests
  headers: {
    'Content-Type': 'application/json',
  },
});

const { signIn, signUp, useSession, signOut } = authClient;
export { signIn, signUp, useSession, signOut };