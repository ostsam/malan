import { createAuthClient } from "better-auth/react";

const isProduction = process.env.NODE_ENV === 'production';
const baseURL = isProduction 
  ? 'https://www.malan.vercel.app/api/auth' 
  : 'http://localhost:3000/api/auth';

export const authClient = createAuthClient({
  baseURL,
  credentials: 'include',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Add request interceptor to handle CORS
  requestInterceptor: async (config: {
    method?: string;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    withCredentials?: boolean;
    [key: string]: any;
  }) => {
    // Ensure credentials are included in all requests
    config.credentials = 'include';
    config.withCredentials = true;
    
    // Add CORS headers if not present
    if (!config.headers) {
      config.headers = {};
    }
    
    // Add CORS headers for non-simple requests
    if (config.method?.toUpperCase() !== 'GET') {
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    return config;
  },
});

const { signIn, signUp, useSession, signOut } = authClient;
export { signIn, signUp, useSession, signOut };