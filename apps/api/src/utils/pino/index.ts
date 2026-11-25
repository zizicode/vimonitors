import pino, { type Logger } from "pino";
import { env } from "../../env.js";

const isProduction = env.NODE_ENV === "production";

export const logger: Logger = pino({
  level: isProduction ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.apiKey",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

/**
 * Crea un logger hijo con el nombre del módulo o servicio
 */
export function createLogger(
  module: string,
  bindings?: Record<string, unknown>
): Logger {
  return logger.child({ module, ...bindings });
}