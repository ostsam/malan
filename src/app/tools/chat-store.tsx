import { generateId } from "ai";
import { existsSync, mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { Message } from "ai";

export interface ChatSettings {
  nativeLanguage: string;
  selectedLanguage: string;
  selectedLevel: string;
  interlocutor: string;
  name?: string; 
}

export interface ChatData {
  settings: ChatSettings;
  messages: Message[];
}

export async function createChat(settings: ChatSettings): Promise<string> {
  const id = generateId(); // generate a unique chat ID
  const initialChatData: ChatData = {
    settings,
    messages: [],
  };
  await writeFile(getChatFile(id), JSON.stringify(initialChatData, null, 2));
  return id;
}

function getChatFile(id: string): string {
  const chatDir = path.join(process.cwd(), ".chats");
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true });
  return path.join(chatDir, `${id}.json`);
}

export async function loadChat(id: string): Promise<ChatData> {
  const fileContent = await readFile(getChatFile(id), "utf8");
  const chatData: ChatData = JSON.parse(fileContent);
  if (!chatData.settings) {
    chatData.settings = {};
  }
  return chatData;
}

export async function saveChat({
  id,
  messages,
}: // role is not used here anymore, consider removing if not needed elsewhere
{
  id: string;
  messages: Message[];
  // role: string; 
}): Promise<void> {
  const chatData = await loadChat(id); // Load existing data to preserve settings
  chatData.messages = messages; // Update only the messages
  const content = JSON.stringify(chatData, null, 2);
  await writeFile(getChatFile(id), content);
}
