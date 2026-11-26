import { Hono } from "hono";
import { getHealth } from "./health.controller.js";

export const healthRouter = new Hono();

healthRouter.get("/health", getHealth);