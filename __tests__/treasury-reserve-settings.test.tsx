import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TreasuryReserveSettings from "@/components/features/settings/TreasuryReserveSettings";
import PayrollWizard from "@/components/features/payroll/PayrollWizard";
import { useTreasuryReserveStore } from "@/stores/treasuryReserve";
import { usePayrollWizardStore } from "@/stores/payrollWizard";
import {
  DEFAULT_RESERVE_THRESHOLD,
  MAX_RESERVE_THRESHOLD,
  validateReserveThreshold,
} from "@/lib/treasury/reserveConfig";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/stores/walletStore", () => ({
  useWalletStore: Object.assign(
    (selector: (state: { network: string }) => unknown) => selector({ network: "TESTNET" }),
    {
      getState: () => ({ network: "TESTNET" }),
      setState: vi.fn(),
    },
  ),
}));

vi.mock("@/components/providers/StellarProvider", () => ({
  EXPECTED_NETWORK: "TESTNET",
  useStellar: () => ({ publicKey: "GTEST123" }),
}));

function resetStores() {
  window.localStorage.clear();
  useTreasuryReserveStore.setState({
    reserveThreshold: DEFAULT_RESERVE_THRESHOLD,
    updatedAt: null,
    updatedBy: null,
  });
  usePayrollWizardStore.getState().reset();
}

describe("validateReserveThreshold", () => {
  it("rejects empty and whitespace-only values", () => {
    expect(validateReserveThreshold("")).toEqual({
      ok: false,
      error: "Reserve threshold is required.",
    });
    expect(validateReserveThreshold("   ").ok).toBe(false);
  });

  it("rejects non-numeric, negative, and over-precise values", () => {
    for (const input of ["abc", "-100", "1e5", "$25000", "25000.999"]) {
      const result = validateReserveThreshold(input);
      expect(result.ok, input).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/valid amount/i);
      }
    }
  });

  it("rejects values above the configured maximum", () => {
    const result = validateReserveThreshold(String(MAX_RESERVE_THRESHOLD + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/or less/i);
    }
  });

  it("accepts zero, whole numbers, and two-decimal amounts", () => {
    expect(validateReserveThreshold("0")).toEqual({ ok: true, value: 0 });
    expect(validateReserveThreshold(" 25000 ")).toEqual({ ok: true, value: 25000 });
    expect(validateReserveThreshold("12500.75")).toEqual({ ok: true, value: 12500.75 });
  });
});

describe("TreasuryReserveSettings", () => {
  beforeEach(resetStores);
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the default reserve and persisted-save state", () => {
    render(<TreasuryReserveSettings />);

    expect(screen.getByTestId("current-reserve-threshold")).toHaveTextContent("$25,000");
    expect(screen.getByText(/no changes saved yet/i)).toBeInTheDocument();
  });

  it("rejects an empty threshold with useful feedback and does not save", () => {
    render(<TreasuryReserveSettings />);

    fireEvent.change(screen.getByLabelText(/minimum reserve after payroll/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save reserve threshold/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Reserve threshold is required.");
    expect(screen.getByLabelText(/minimum reserve after payroll/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(useTreasuryReserveStore.getState().reserveThreshold).toBe(DEFAULT_RESERVE_THRESHOLD);
  });

  it("rejects invalid threshold values and keeps the saved configuration", () => {
    render(<TreasuryReserveSettings />);
    const input = screen.getByLabelText(/minimum reserve after payroll/i);

    for (const invalid of ["-500", "not-a-number", "1000000001"]) {
      fireEvent.change(input, { target: { value: invalid } });
      fireEvent.click(screen.getByRole("button", { name: /save reserve threshold/i }));

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText(/reserve threshold saved/i)).not.toBeInTheDocument();
      expect(useTreasuryReserveStore.getState().reserveThreshold).toBe(DEFAULT_RESERVE_THRESHOLD);
    }
  });

  it("saves a valid threshold and exposes it to consumers", () => {
    render(<TreasuryReserveSettings />);
    const input = screen.getByLabelText(/minimum reserve after payroll/i);

    fireEvent.change(input, { target: { value: "30000" } });
    fireEvent.click(screen.getByRole("button", { name: /save reserve threshold/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/reserve threshold saved/i);
    expect(screen.getByTestId("current-reserve-threshold")).toHaveTextContent("$30,000");
    expect(useTreasuryReserveStore.getState().reserveThreshold).toBe(30000);
    expect(useTreasuryReserveStore.getState().updatedAt).not.toBeNull();
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "zk-payroll-treasury-reserve",
      expect.stringContaining('"reserveThreshold":30000'),
    );
  });

  it("resets to the default threshold", () => {
    useTreasuryReserveStore.setState({ reserveThreshold: 40000 });
    render(<TreasuryReserveSettings />);

    fireEvent.click(screen.getByRole("button", { name: /reset to default/i }));

    expect(useTreasuryReserveStore.getState().reserveThreshold).toBe(DEFAULT_RESERVE_THRESHOLD);
    expect(screen.getByTestId("current-reserve-threshold")).toHaveTextContent("$25,000");
  });
});

describe("Payroll warnings consume saved reserve configuration", () => {
  beforeEach(resetStores);
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderConfirmStep() {
    usePayrollWizardStore.setState({
      currentStep: "confirm",
      employeeIds: ["emp_001", "emp_002"],
      totalAmount: 19500, // $45,000 balance - $19,500 leaves $25,500
      proofStatus: "success",
      isProofNearingExpiration: false,
      treasuryBalanceOverride: null,
    });
    render(<PayrollWizard />);
  }

  it("warns when the saved threshold is above the projected remaining balance", () => {
    useTreasuryReserveStore.setState({ reserveThreshold: 30000 });
    renderConfirmStep();

    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(
      screen.getByText(/less than \$30,000 remaining after run/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Low Buffer")).toBeInTheDocument();
  });

  it("stays ready when the saved threshold is below the projected remaining balance", () => {
    useTreasuryReserveStore.setState({ reserveThreshold: 1000 });
    renderConfirmStep();

    expect(screen.queryByText("Warning")).not.toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Funded")).toBeInTheDocument();
  });
});
