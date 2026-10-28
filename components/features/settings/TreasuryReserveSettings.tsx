"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useTreasuryReserveStore } from "@/stores/treasuryReserve";
import {
  DEFAULT_RESERVE_THRESHOLD,
  MAX_RESERVE_THRESHOLD,
  formatReserveThreshold,
  validateReserveThreshold,
} from "@/lib/treasury/reserveConfig";

function TreasuryReserveSettings() {
  const { reserveThreshold, updatedAt, setReserveThreshold, resetReserveThreshold } =
    useTreasuryReserveStore();
  const [input, setInput] = useState(String(reserveThreshold));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Keep the field in sync when the persisted configuration changes (e.g. reset).
  useEffect(() => {
    setInput(String(reserveThreshold));
  }, [reserveThreshold]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateReserveThreshold(input);

    if (!result.ok) {
      setSaved(false);
      setError(result.error);
      return;
    }

    setError(null);
    setReserveThreshold(result.value);
    setSaved(true);
    toast.success("Treasury reserve updated", {
      description: `Payroll runs will warn when less than ${formatReserveThreshold(result.value)} remains.`,
    });
  };

  const handleReset = () => {
    resetReserveThreshold();
    setError(null);
    setSaved(false);
    toast.success("Treasury reserve reset", {
      description: `Restored the default ${formatReserveThreshold(DEFAULT_RESERVE_THRESHOLD)} reserve.`,
    });
  };

  return (
    <section aria-labelledby="treasury-reserve-heading" className="space-y-6 max-w-3xl">
      <div>
        <h2 id="treasury-reserve-heading" className="text-lg font-semibold text-gray-900">
          Treasury Reserve Settings
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Set the minimum treasury balance that must remain after payroll execution. Payroll
          readiness checks use this threshold to warn admins before a run drains the reserve.
        </p>
      </div>

      <article className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-700">Current threshold</h3>
          <span className="text-2xl font-bold text-gray-900" data-testid="current-reserve-threshold">
            {formatReserveThreshold(reserveThreshold)}
          </span>
        </div>

        <p className="text-xs text-gray-500">
          {updatedAt
            ? `Last saved ${new Date(updatedAt).toLocaleString("en-US")}.`
            : "Using the default reserve; no changes saved yet."}
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 border-t pt-4">
          <div>
            <label htmlFor="reserve-threshold" className="block text-sm font-medium text-gray-900">
              Minimum reserve after payroll (USD)
            </label>
            <p id="reserve-threshold-help" className="text-xs text-gray-500 mt-1">
              Enter an amount between $0 and {formatReserveThreshold(MAX_RESERVE_THRESHOLD)}.
              A payroll run leaving less than this amount triggers a warning.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500" aria-hidden="true">
                $
              </span>
              <input
                id="reserve-threshold"
                name="reserveThreshold"
                type="text"
                inputMode="decimal"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setSaved(false);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  error ? "reserve-threshold-error reserve-threshold-help" : "reserve-threshold-help"
                }
                className={`w-48 rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  error ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="25000"
              />
            </div>

            {error && (
              <p
                id="reserve-threshold-error"
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs text-red-700"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            {saved && !error && (
              <p
                role="status"
                className="mt-2 flex items-center gap-1.5 text-xs text-green-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Reserve threshold saved.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              Save reserve threshold
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-white text-gray-700 text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reset to default ({formatReserveThreshold(DEFAULT_RESERVE_THRESHOLD)})
            </button>
          </div>
        </form>
      </article>

      <aside className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <h3 className="text-sm font-medium text-indigo-900">How this is used</h3>
        <p className="text-sm text-indigo-800 mt-1">
          The payroll confirmation step compares the projected treasury balance after the run
          against this threshold. If the remaining balance falls below it, the run is flagged
          as a low-buffer warning; insufficient balances still block submission.
        </p>
      </aside>
    </section>
  );
}

export default TreasuryReserveSettings;
