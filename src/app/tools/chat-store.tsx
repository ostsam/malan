import { generateId } from "ai";
import { existsSync, mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { Message } from "ai";

export interface ChatSettings {
  nativeLanguage: string | undefined;
  selectedLanguage: string | undefined;
  selectedLevel: string | undefined;
  interlocutor: string | undefined;
  name?: string;
}

export interface ChatData {
  settings: ChatSettings;
  messages: Message[];
}

export async function createChat(settings: ChatSettings): Promise<string> {
  const chatId = generateId(); // generate a unique chat ID
  const initialChatData: ChatData = {
    settings,
    messages: [],
  };
  await writeFile(getChatFile(chatId), JSON.stringify(initialChatData, null, 2));
  return chatId;
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
    chatData.settings = {
      nativeLanguage: undefined,
      selectedLanguage: undefined,
      selectedLevel: undefined,
      interlocutor: undefined,
      name: undefined,
    };
  }
  return chatData;
}

export async function saveChat({
  id,
  messages,
}: 
{
  id: string;
  messages: Message[];
}): Promise<void> {
  const chatData = await loadChat(id); // Load existing data to preserve settings
  chatData.messages = messages; // Update only the messages
  const content = JSON.stringify(chatData, null, 2);
  await writeFile(getChatFile(id), content);
}
