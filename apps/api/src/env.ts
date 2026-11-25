// apps/api/src/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:5173"),
});

export const env = EnvSchema.parse(process.env);