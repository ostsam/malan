// Shared API types for consistent error handling and responses

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
  };
}

// Common error types
export type DatabaseError = Error & {
  code?: string;
  constraint?: string;
};

export type ValidationError = Error & {
  field?: string;
  value?: unknown;
};

// Utility type for unknown errors
export type UnknownError = Error | ApiError | string | unknown;
