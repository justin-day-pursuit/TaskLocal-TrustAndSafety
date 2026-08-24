export type QueryFailureKind = "error" | "timeout";

export const DB_QUERY_TIMEOUT_MS = 10_000;
export const GEMINI_QUERY_TIMEOUT_MS = 90_000;

export interface ClassifiedFailure {
  kind: QueryFailureKind;
  message: string;
}

export interface QueryFailure {
  error: string;
  failureKind: QueryFailureKind;
}

export interface SuccessfulQuery<T> {
  data: T;
  error: null;
  failureKind: null;
}

export interface FailedQuery<T = null> {
  data: T;
  error: string;
  failureKind: QueryFailureKind;
}

export type DataQueryResult<T> = SuccessfulQuery<T> | FailedQuery<T | null>;

export const QUERY_COPY = {
  connection: {
    loading: "Checking the database connection…",
    error: "There was an error checking the database connection.",
    timeout: "The request timed out while checking the database connection.",
  },
  dashboardStats: {
    loading: "Loading dashboard stats from the database…",
    error: "There was an error loading dashboard stats.",
    timeout: "The request timed out while loading dashboard stats.",
  },
  flaggedReviews: {
    loading: "Loading open flagged reviews…",
    error: "There was an error loading open flagged reviews.",
    timeout: "The request timed out while loading open flagged reviews.",
  },
  reviewsCatalog: {
    loading: "Loading the reviews catalog…",
    error: "There was an error loading the reviews catalog.",
    timeout: "The request timed out while loading the reviews catalog.",
  },
  reviewDetail: {
    loading: "Loading review, booking, and listing details…",
    error: "There was an error loading review, booking, and listing details.",
    timeout:
      "The request timed out while loading review, booking, and listing details.",
  },
  bookings: {
    loading: "Loading bookings for these reviews…",
    error: "There was an error loading bookings for these reviews.",
    timeout: "The request timed out while loading bookings for these reviews.",
  },
  repeatFlags: {
    loading: "Loading repeat flag counts…",
    error: "There was an error loading repeat flag counts.",
    timeout: "The request timed out while loading repeat flag counts.",
  },
  resolve: {
    loading: "Resolving this review…",
    error: "There was an error resolving this review.",
    timeout: "The request timed out while resolving this review.",
  },
  trendReport: {
    loading: "Loading the last trend report…",
    error: "There was an error loading the last trend report.",
    timeout: "The request timed out while loading the last trend report.",
  },
  trendGenerate: {
    loading: "Generating the trend report…",
    error: "There was an error generating the trend report.",
    timeout: "The request timed out while generating the trend report.",
  },
} as const;

export type QueryCopyKey = keyof typeof QUERY_COPY;

function errorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    return String((error as { name?: unknown }).name ?? "");
  }
  return "";
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "";
}

export function isTimeoutFailure(error: unknown): boolean {
  const name = errorName(error);
  if (name === "AbortError" || name === "TimeoutError") {
    return true;
  }

  const message = errorMessage(error);
  if (name === "DOMException") {
    return /timeout|timed out|aborted/i.test(message);
  }

  return (
    /AbortError|TimeoutError/i.test(message) ||
    /timed out/i.test(message) ||
    /user aborted a request/i.test(message) ||
    /signal is aborted/i.test(message) ||
    /aborted \(timeout or manual cancellation\)/i.test(message)
  );
}

export function classifyQueryFailure(error: unknown): ClassifiedFailure {
  const message = errorMessage(error);
  if (isTimeoutFailure(error)) {
    return {
      kind: "timeout",
      message: message || "The request timed out.",
    };
  }
  return {
    kind: "error",
    message: message || "Request failed.",
  };
}

export function toQueryFailure(error: unknown, fallback: string): QueryFailure {
  const classified = classifyQueryFailure(error);
  return {
    error: classified.message || fallback,
    failureKind: classified.kind,
  };
}

export function queryOk<T>(data: T): SuccessfulQuery<T> {
  return { data, error: null, failureKind: null };
}

export function queryFail<T = null>(
  error: unknown,
  fallback: string,
  data: T = null as T
): FailedQuery<T> {
  const failure = toQueryFailure(error, fallback);
  return {
    data,
    error: failure.error,
    failureKind: failure.failureKind,
  };
}

export function copyForFailure(
  key: QueryCopyKey,
  kind: QueryFailureKind | null | undefined
): string {
  if (kind === "timeout") {
    return QUERY_COPY[key].timeout;
  }
  return QUERY_COPY[key].error;
}

export function httpStatusForQueryFailure(
  kind: QueryFailureKind | null | undefined
): 500 | 504 {
  return kind === "timeout" ? 504 : 500;
}

export async function withTimeout<T>(
  work: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  timeoutMs: number
): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  const promise = typeof work === "function" ? work(signal) : work;

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const timeoutError = new Error("The operation timed out.");
      timeoutError.name = "TimeoutError";
      reject(timeoutError);
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted || isTimeoutFailure(error)) {
          onAbort();
          return;
        }
        reject(error);
      }
    );
  });
}

export function fetchWithDbTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const timeout = AbortSignal.timeout(DB_QUERY_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  return fetch(input, { ...init, signal });
}
