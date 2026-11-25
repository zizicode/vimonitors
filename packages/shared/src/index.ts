// packages/shared/src/index.ts
import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "sales", "inventory", "customer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export function centsToDisplay(cents: number, currency = "USD"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export {
  ApiClientError,
  createRpcClient,
  type ApiErrorPayload,
  type ClientKind,
  type CreateApiClientOptions,
} from "./api-client";