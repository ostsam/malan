import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/app/api/auth/[...all]/auth";


export const { GET, POST } = toNextJsHandler(auth);