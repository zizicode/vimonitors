// apps/api/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { ZodError } from "zod";
import { env } from "./env.js";
import { createLogger } from "./utils/pino/index.js";
import { healthRouter } from "./modules/health/health.routes.js";

export const logger = createLogger("SERVER")

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}


const allowedOrigins = env.CORS_ORIGINS
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();
  c.header("X-Request-Id", requestId);
  c.set("requestId", requestId);

  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;

  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs,
    client: c.req.header("X-Client") ?? "unknown",
  });
});

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : ""),
    allowHeaders: ["Content-Type", "Authorization", "X-Client", "X-Request-Id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-Request-Id"],
  })
);

app.use("*", secureHeaders());

app.route("/", healthRouter);

app.onError((err, c) => {
  const requestId = c.get("requestId") ?? crypto.randomUUID();

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "La solicitud contiene datos inválidos.",
          details: err.flatten().fieldErrors,
          requestId,
        },
      },
      422
    );
  }

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details ?? null,
          requestId,
        },
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500
    );
  }

  logger.error({ requestId, err }, "Error no controlado en la API");
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno en el servidor.",
        details: null,
        requestId,
      },
    },
    500
  );
});

export type AppType = typeof app;
