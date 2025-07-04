import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* other config options */
  env: {
    // Make OpenAI API key available at build time for server-side code only.
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
};

export default nextConfig;
