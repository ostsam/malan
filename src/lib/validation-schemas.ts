import { z } from "zod";

// Base schemas for common patterns
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");
const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name too long");

// Language codes (ISO 639-1)
const languageCodeSchema = z
  .string()
  .regex(/^[a-z]{2}$/, "Invalid language code");

// Chat message validation - critical for LLM prompt injection prevention
const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message too long")
    .refine(
      (msg) => !msg.includes("<script>") && !msg.includes("javascript:"),
      "Invalid content detected"
    )
    .refine(
      (msg) =>
        !msg.toLowerCase().includes("ignore previous") &&
        !msg.toLowerCase().includes("system prompt") &&
        !msg.toLowerCase().includes("you are now"),
      "Invalid prompt detected"
    ),
  id: z.string().optional(),
  voice: z.string().optional(),
});

// Chat settings validation
const chatSettingsSchema = z.object({
  nativeLanguage: languageCodeSchema.nullable(),
  nativeLanguageLabel: z.string().max(50).nullable(),
  selectedLanguage: languageCodeSchema.nullable(),
  selectedLanguageLabel: z.string().max(50).nullable(),
  selectedLevel: z.string().max(20).nullable(),
  interlocutor: z.string().max(50).nullable(),
});

// Wordlist operations
const wordlistSchema = z.object({
  word: z
    .string()
    .min(1, "Word is required")
    .max(100, "Word too long")
    .refine(
      (word) => /^[\p{L}\p{M}\s'-]+$/u.test(word),
      "Word contains invalid characters"
    ),
  lang: languageCodeSchema,
});

// Dictionary lookup
const dictionaryLookupSchema = z.object({
  word: z
    .string()
    .min(1, "Word is required")
    .max(100, "Word too long")
    .refine(
      (word) => /^[\p{L}\p{M}\s'-]+$/u.test(word),
      "Word contains invalid characters"
    ),
  lang: languageCodeSchema,
  target: languageCodeSchema.optional(),
  provider: z.enum(["wiki", "gpt", "google"]).optional(),
});

// Profile updates
const profileUpdateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

// Preferences updates
const preferencesSchema = z.object({
  nativeLanguage: languageCodeSchema.optional(),
  targetLanguage: languageCodeSchema.optional(),
  dailyGoal: z.number().min(1).max(100).optional(),
  ttsVoice: z.string().max(32).optional(),
  emailNotifications: z.boolean().optional(),
});

// Password change
const passwordChangeSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Chat slug updates
const chatSlugSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug cannot be empty")
    .max(100, "Slug too long")
    .regex(/^[a-zA-Z0-9\s-_]+$/, "Slug contains invalid characters"),
});

// Avatar upload
const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "File too large (max 5MB)")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Invalid file type"
    ),
});

// API request schemas
export const apiSchemas = {
  chat: {
    message: chatMessageSchema,
    settings: chatSettingsSchema,
    slug: chatSlugSchema,
  },
  wordlist: {
    save: wordlistSchema,
    lookup: dictionaryLookupSchema,
  },
  profile: {
    update: profileUpdateSchema,
    preferences: preferencesSchema,
    password: passwordChangeSchema,
  },
  avatar: {
    upload: avatarUploadSchema,
  },
};

// Validation helper functions
export function validateChatMessage(data: unknown) {
  return chatMessageSchema.parse(data);
}

export function validateWordlistOperation(data: unknown) {
  return wordlistSchema.parse(data);
}

export function validateDictionaryLookup(data: unknown) {
  return dictionaryLookupSchema.parse(data);
}

export function validateProfileUpdate(data: unknown) {
  return profileUpdateSchema.parse(data);
}

export function validatePreferences(data: unknown) {
  return preferencesSchema.parse(data);
}

export function validatePasswordChange(data: unknown) {
  return passwordChangeSchema.parse(data);
}

export function validateChatSlug(data: unknown) {
  return chatSlugSchema.parse(data);
}

export function validateAvatarUpload(data: unknown) {
  return avatarUploadSchema.parse(data);
}

// Type exports for use in components
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSettings = z.infer<typeof chatSettingsSchema>;
export type WordlistOperation = z.infer<typeof wordlistSchema>;
export type DictionaryLookup = z.infer<typeof dictionaryLookupSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
export type ChatSlug = z.infer<typeof chatSlugSchema>;
export type AvatarUpload = z.infer<typeof avatarUploadSchema>;
