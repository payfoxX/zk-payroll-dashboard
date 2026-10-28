import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TreasuryReserveConfig } from "@/types";
import { DEFAULT_RESERVE_THRESHOLD } from "@/lib/treasury/reserveConfig";

interface TreasuryReserveState extends TreasuryReserveConfig {
  setReserveThreshold: (threshold: number, updatedBy?: string | null) => void;
  resetReserveThreshold: () => void;
}

export const useTreasuryReserveStore = create<TreasuryReserveState>()(
  persist(
    (set) => ({
      reserveThreshold: DEFAULT_RESERVE_THRESHOLD,
      updatedAt: null,
      updatedBy: null,
      setReserveThreshold: (reserveThreshold, updatedBy = null) =>
        set({
          reserveThreshold,
          updatedAt: new Date().toISOString(),
          updatedBy,
        }),
      resetReserveThreshold: () =>
        set({
          reserveThreshold: DEFAULT_RESERVE_THRESHOLD,
          updatedAt: null,
          updatedBy: null,
        }),
    }),
    { name: "zk-payroll-treasury-reserve" },
  ),
);
