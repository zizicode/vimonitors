// apps/dashboard/src/lib/api.ts
import { createRpcClient, type ApiClientError } from "@vimonitors/shared";
import type { AppType } from "../../../api/src/client-type";

let currentAccessToken: string | null = null;
let unauthorizedHandler: ((error: ApiClientError) => void) | null = null;

export function setDashboardAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function setDashboardUnauthorizedHandler(
  handler: ((error: ApiClientError) => void) | null
): void {
  unauthorizedHandler = handler;
}

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const dashboardApi = createRpcClient<AppType>({
  baseUrl: apiUrl,
  client: "dashboard",
  getAccessToken: () => currentAccessToken,
  onUnauthorized: async (error) => {
    if (unauthorizedHandler) {
      unauthorizedHandler(error);
    }
  },
});