import { prisma } from "../../lib/prisma";

export interface HealthCheckResult {
  status: "ok" | "degraded";
  timestamp: string;
  database: {
    reachable: boolean;
    latencyMs: number;
  };
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - startedAt);

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        reachable: true,
        latencyMs,
      },
    };
  } catch {
    const latencyMs = Math.round(performance.now() - startedAt);

    return {
      status: "degraded",
      timestamp: new Date().toISOString(),
      database: {
        reachable: false,
        latencyMs,
      },
    };
  }
}