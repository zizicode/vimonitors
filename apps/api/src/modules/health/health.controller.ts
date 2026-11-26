import type { Context } from "hono";
import { checkHealth } from "./health.service.js";

export async function getHealth(c: Context) {
  const result = await checkHealth();
  const httpStatus = result.database.reachable ? 200 : 503;
  return c.json(result, httpStatus);
}