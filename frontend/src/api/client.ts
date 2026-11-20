import type {
  CheckoutConflictItem,
  CheckoutConflictReason,
  ValidationErrors,
} from '../types/api';

const RAW_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:8000/api/v1';

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConflictReason(value: unknown): value is CheckoutConflictReason {
  return value === 'INSUFFICIENT_STOCK' || value === 'PRODUCT_UNAVAILABLE';
}

function parseConflictItems(errors: unknown): CheckoutConflictItem[] {
  if (!isRecord(errors) || !Array.isArray(errors.items)) {
    return [];
  }

  const parsed: CheckoutConflictItem[] = [];

  for (const entry of errors.items) {
    if (!isRecord(entry)) {
      continue;
    }

    const productId = Number(entry.product_id);
    const requestedQuantity = Number(entry.requested_quantity);
    const availableStock = Number(entry.available_stock);

    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(requestedQuantity) ||
      !Number.isInteger(availableStock)
    ) {
      continue;
    }

    parsed.push({
      product_id: productId,
      product_name: typeof entry.product_name === 'string' ? entry.product_name : null,
      requested_quantity: requestedQuantity,
      available_stock: availableStock,
      reason: isConflictReason(entry.reason) ? entry.reason : 'INSUFFICIENT_STOCK',
    });
  }

  return parsed;
}

function parseValidationErrors(errors: unknown): ValidationErrors {
  if (!isRecord(errors)) {
    return {};
  }

  const parsed: ValidationErrors = {};

  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      const stringMessages = messages.filter(
        (item): item is string => typeof item === 'string',
      );
      if (stringMessages.length > 0) {
        parsed[field] = stringMessages;
      }
    }
  }

  return parsed;
}

export class ApiError extends Error {
  readonly status: number;
  readonly validationErrors: ValidationErrors;
  readonly conflicts: CheckoutConflictItem[];
  readonly isNetworkError: boolean;

  constructor(options: {
    message: string;
    status: number;
    validationErrors?: ValidationErrors;
    conflicts?: CheckoutConflictItem[];
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.validationErrors = options.validationErrors ?? {};
    this.conflicts = options.conflicts ?? [];
    this.isNetworkError = options.isNetworkError ?? false;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isConflictError(): boolean {
    return this.status === 409;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiError({
      message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.',
      status: 0,
      isNetworkError: true,
    });
  }

  let parsedBody: unknown = null;
  try {
    const text = await response.text();
    parsedBody = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    const bodyRecord = isRecord(parsedBody) ? parsedBody : null;
    const message =
      bodyRecord && typeof bodyRecord.message === 'string' && bodyRecord.message.trim() !== ''
        ? bodyRecord.message
        : `Permintaan gagal dengan status HTTP ${response.status}.`;

    const errors = bodyRecord ? bodyRecord.errors : undefined;

    throw new ApiError({
      message,
      status: response.status,
      validationErrors: response.status === 422 ? parseValidationErrors(errors) : {},
      conflicts: response.status === 409 ? parseConflictItems(errors) : [],
    });
  }

  return parsedBody as T;
}
