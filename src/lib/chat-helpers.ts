import { Chat } from "@/components/app-sidebar";
import {
  isToday,
  isYesterday,
  isThisWeek,
  format,
  parseISO,
  isValid,
} from "date-fns";

export const groupChatsByDate = (chats: Chat[]) => {
  return chats.reduce(
    (acc, chat) => {
      let groupKey: string;
      //
      if (chat.lastMessageAt) {
        const chatDate = parseISO(chat.lastMessageAt);
        if (isValid(chatDate)) {
          if (isToday(chatDate)) {
            groupKey = "Today";
          } else if (isYesterday(chatDate)) {
            groupKey = "Yesterday";
          } else if (isThisWeek(chatDate, { weekStartsOn: 1 })) {
            groupKey = "Previous Week";
          } else {
            groupKey = format(chatDate, "MMMM yyyy");
          }
        } else {
          groupKey = "Older";
        }
      } else {
        groupKey = "Older";
      }

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(chat);
      return acc;
    },
    {} as Record<string, Chat[]>
  );
};
