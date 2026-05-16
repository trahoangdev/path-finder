import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiErrorPayload,
  HealthResponse,
} from "./types";

/**
 * Lightweight typed fetch client for the PathFinder Hono backend.
 *
 * Why not @hono/client? — keeps the client zero-dep on the server package and
 * avoids monorepo path mapping. The surface is tiny enough to hand-roll.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_PATHFINDER_API_URL?.replace(/\/+$/, "") ??
  "http://localhost:4000";

export class PathFinderApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, payload: ApiErrorPayload | { message?: string }) {
    const code =
      "error" in payload && payload.error?.code ? payload.error.code : "UNKNOWN";
    const message =
      "error" in payload && payload.error?.message
        ? payload.error.message
        : ("message" in payload && payload.message) || `HTTP ${status}`;
    super(message);
    this.name = "PathFinderApiError";
    this.status = status;
    this.code = code;
    this.details =
      "error" in payload ? (payload as ApiErrorPayload).error.details : undefined;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 90_000, headers, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
    const text = await res.text();
    const body = text ? safeJsonParse(text) : null;
    if (!res.ok) {
      throw new PathFinderApiError(res.status, body ?? { message: text });
    }
    return body as T;
  } catch (err) {
    if (err instanceof PathFinderApiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new PathFinderApiError(0, {
        message: `Request timed out after ${timeoutMs}ms`,
      });
    }
    throw new PathFinderApiError(0, {
      message: (err as Error).message || "Network error",
    });
  } finally {
    clearTimeout(timer);
  }
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ─── Public surface ──────────────────────────────────────────────────────────

export const pathfinderApi = {
  baseUrl: BASE_URL,

  health(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  analyze(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
    return request<AnalyzeResponse>("/api/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
