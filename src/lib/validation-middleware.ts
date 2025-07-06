import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiSchemas } from "./validation-schemas";

export interface ValidationError {
  field: string;
  message: string;
}

export function createValidationMiddleware<T extends z.ZodSchema>(
  schema: T,
  extractData: (req: NextRequest) => unknown
) {
  return async (req: NextRequest) => {
    try {
      const data = extractData(req);
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationErrors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Internal validation error" },
        { status: 500 }
      );
    }
  };
}

// Helper functions for different request types
export function extractJsonData(req: NextRequest) {
  return req.json();
}

export function extractFormData(req: NextRequest) {
  return req.formData();
}

export function extractQueryParams(req: NextRequest) {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// Pre-configured middleware for common operations
export const validationMiddleware = {
  chatMessage: createValidationMiddleware(
    apiSchemas.chat.message,
    extractJsonData
  ),
  wordlistSave: createValidationMiddleware(
    apiSchemas.wordlist.save,
    extractJsonData
  ),
  dictionaryLookup: createValidationMiddleware(
    apiSchemas.wordlist.lookup,
    extractQueryParams
  ),
  profileUpdate: createValidationMiddleware(
    apiSchemas.profile.update,
    extractJsonData
  ),
  preferences: createValidationMiddleware(
    apiSchemas.profile.preferences,
    extractJsonData
  ),
  passwordChange: createValidationMiddleware(
    apiSchemas.profile.password,
    extractJsonData
  ),
  chatSlug: createValidationMiddleware(apiSchemas.chat.slug, extractJsonData),
  avatarUpload: createValidationMiddleware(
    apiSchemas.avatar.upload,
    extractFormData
  ),
};
