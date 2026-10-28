import { z } from "zod";
import type { TreasuryReserveEvaluation } from "@/types";

/** Default minimum balance to keep after payroll, matching the legacy safety buffer. */
export const DEFAULT_RESERVE_THRESHOLD = 25000;

/** Upper bound guards against typos that would otherwise block every payroll run. */
export const MAX_RESERVE_THRESHOLD = 1_000_000_000;

const reserveThresholdSchema = z
  .string()
  .trim()
  .min(1, { message: "Reserve threshold is required." })
  .regex(/^\d+(\.\d{1,2})?$/, {
    message: "Enter a valid amount using numbers and up to 2 decimal places.",
  })
  .transform((value) => Number(value))
  .refine((value) => value <= MAX_RESERVE_THRESHOLD, {
    message: `Reserve threshold must be $${MAX_RESERVE_THRESHOLD.toLocaleString("en-US")} or less.`,
  });

export type ReserveThresholdValidation =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Validate a raw threshold input (as typed by an admin) before persisting it.
 * Empty, non-numeric, negative, over-precise, and over-limit values are rejected.
 */
export function validateReserveThreshold(input: string): ReserveThresholdValidation {
  const result = reserveThresholdSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Enter a valid reserve threshold.",
    };
  }
  return { ok: true, value: result.data };
}

export function formatReserveThreshold(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * Evaluate payroll readiness against the configured reserve threshold.
 * Shared by the confirmation warnings and any other readiness checks.
 */
export function evaluateTreasuryReserve({
  balance,
  payrollTotal,
  threshold,
}: {
  balance: number;
  payrollTotal: number;
  threshold: number;
}): TreasuryReserveEvaluation {
  const projectedRemaining = balance - payrollTotal;
  const safeThreshold = Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_RESERVE_THRESHOLD;

  if (balance < payrollTotal) {
    return {
      threshold: safeThreshold,
      balance,
      payrollTotal,
      projectedRemaining,
      status: "insufficient",
      message: `Treasury balance is insufficient: $${balance.toLocaleString("en-US")} available, $${payrollTotal.toLocaleString("en-US")} required.`,
    };
  }

  if (projectedRemaining < safeThreshold) {
    return {
      threshold: safeThreshold,
      balance,
      payrollTotal,
      projectedRemaining,
      status: "low-buffer",
      message: `Treasury balance ($${balance.toLocaleString("en-US")}) is approaching the minimum safety buffer threshold (less than ${formatReserveThreshold(safeThreshold)} remaining after run).`,
    };
  }

  return {
    threshold: safeThreshold,
    balance,
    payrollTotal,
    projectedRemaining,
    status: "funded",
    message: null,
  };
}
