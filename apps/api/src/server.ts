// apps/api/src/server.ts
import { serve } from "@hono/node-server";
import { app, logger } from "./app";
import { env } from "./env";

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info({ port: info.port }, "VIMONITORS API escuchando");
  }
);