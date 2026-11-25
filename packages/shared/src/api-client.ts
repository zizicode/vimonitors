// packages/shared/src/api-client.ts
import { hc } from "hono/client";
import type { Hono } from "hono";

export type ClientKind = "store" | "dashboard";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly requestId: string | undefined;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    requestId?: string | undefined;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? null;
    this.requestId = params.requestId;
  }
}

export interface CreateApiClientOptions {
  baseUrl: string;
  client: ClientKind;
  getAccessToken?: () => Promise<string | null | undefined> | string | null | undefined;
  onUnauthorized?: (error: ApiClientError) => void | Promise<void>;
}

/**
 * Envuelve el `fetch` utilizado por Hono RPC para:
 * - Enviar `X-Client` (`store` | `dashboard`) y `X-Request-Id`
 * - Adjuntar `Authorization: Bearer <token>` si hay sesión activa
 * - Normalizar respuestas no-2xx en `ApiClientError`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRpcClient<TApp extends Hono<any, any, any>>(
  options: CreateApiClientOptions
): ReturnType<typeof hc<TApp>> {
  const normalizedBaseUrl = options.baseUrl.replace(/\/+$/, "");

  const customFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const requestId = headers.get("X-Request-Id") ?? crypto.randomUUID();

    headers.set("X-Client", options.client);
    headers.set("X-Request-Id", requestId);

    const token = options.getAccessToken ? await options.getAccessToken() : null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let parsedBody: { error?: ApiErrorPayload; message?: string } | null = null;
      try {
        parsedBody = (await response.clone().json()) as {
          error?: ApiErrorPayload;
          message?: string;
        };
      } catch {
        parsedBody = null;
      }

      const responseRequestId =
        parsedBody?.error?.requestId ??
        response.headers.get("X-Request-Id") ??
        requestId;

      const apiError = new ApiClientError({
        status: response.status,
        code: parsedBody?.error?.code ?? `HTTP_${response.status}`,
        message:
          parsedBody?.error?.message ??
          parsedBody?.message ??
          `Error de comunicación con la API (${response.status}).`,
        details: parsedBody?.error?.details,
        requestId: responseRequestId,
      });

      if (response.status === 401 && options.onUnauthorized) {
        await options.onUnauthorized(apiError);
      }

      throw apiError;
    }

    return response;
  };

  return hc<TApp>(normalizedBaseUrl, {
    fetch: customFetch,
  });
}