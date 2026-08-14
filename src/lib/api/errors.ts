/**
 * Maps the backend error envelope `{ error: { code, message, details } }` to a typed
 * AppApiError (DATA_FETCHING_STRATEGY.md §3). Screens branch on `code`, never on message text.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class AppApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'AppApiError';
    this.status = status;
    this.code = shape.code;
    this.details = shape.details;
  }

  /** 4xx client errors are not auto-retried (STATE_MANAGEMENT.md §2.1). */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
  get isOversell(): boolean {
    return this.status === 409;
  }
  get isBusinessRule(): boolean {
    return this.status === 422;
  }
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/** Build an AppApiError from a raw response + parsed JSON body. */
export function toAppApiError(status: number, body: unknown): AppApiError {
  const maybe = (body as { error?: Partial<ApiErrorShape> } | null)?.error;
  return new AppApiError(status, {
    code: maybe?.code ?? codeForStatus(status),
    message: maybe?.message ?? messageForStatus(status),
    details: maybe?.details,
  });
}

function codeForStatus(status: number): string {
  const map: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'STATE_CONFLICT',
    422: 'BUSINESS_RULE',
    429: 'RATE_LIMITED',
    500: 'INTERNAL',
  };
  return map[status] ?? 'UNKNOWN';
}

function messageForStatus(status: number): string {
  return status >= 500
    ? 'Something went wrong on our end. Please try again.'
    : 'Request could not be completed.';
}
