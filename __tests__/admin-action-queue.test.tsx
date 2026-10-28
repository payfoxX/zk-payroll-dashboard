import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AdminActionQueue from "@/components/features/admin/AdminActionQueue";
import { useWalletStore } from "@/stores/walletStore";

let mockBalance = 50000;
let mockProjected = 10000;
let mockTransactions: any[] = [];

vi.mock("@/lib/api/mockData", () => ({
  get MOCK_TREASURY_BALANCE() {
    return {
      balance: mockBalance,
      projectedPayroll: mockProjected,
      lastFunded: "2025-02-15T10:00:00Z",
    };
  },
  get MOCK_TRANSACTIONS() {
    return mockTransactions;
  },
}));

describe("AdminActionQueue Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWalletStore.getState().reset();
    mockBalance = 50000;
    mockProjected = 10000;
    mockTransactions = [];
  });

  it("renders the heading and initial state", () => {
    render(<AdminActionQueue />);
    expect(screen.getByText("Treasury Action Queue")).toBeInTheDocument();
    expect(screen.getByText("High-priority treasury risks and required actions")).toBeInTheDocument();
  });

  it("detects and renders critical low balance risk when balance is less than projected payroll", () => {
    mockBalance = 5000;
    mockProjected = 10000;
    render(<AdminActionQueue />);
    expect(screen.getByText("Critical: Low Treasury Balance")).toBeInTheDocument();
    expect(
      screen.getByText(/Treasury balance \(\$5,000\) is insufficient for the next projected payroll run \(\$10,000\)\./)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Fund Treasury/i })).toHaveAttribute("href", "/treasury");
  });

  it("detects and renders warning low safety buffer when remaining balance is below threshold", () => {
    mockBalance = 30000;
    mockProjected = 10000; // Remaining is 20000 < 25000 safety buffer
    render(<AdminActionQueue />);
    expect(screen.getByText("Warning: Low Treasury Safety Buffer")).toBeInTheDocument();
    expect(
      screen.getByText(/Treasury surplus after next payroll will be below the recommended \$25,000 safety buffer\./)
    ).toBeInTheDocument();
  });

  it("renders unsupported asset warning", () => {
    render(<AdminActionQueue />);
    expect(screen.getByText("Unsupported Asset Detected: EURC")).toBeInTheDocument();
    expect(
      screen.getByText(/Treasury holds a balance of 12,000 EURC, which is not an approved asset/)
    ).toBeInTheDocument();
  });

  it("renders low XLM fee balance warning", () => {
    render(<AdminActionQueue />);
    expect(screen.getByText("Warning: Low XLM Fee Balance")).toBeInTheDocument();
    expect(
      screen.getByText(/Treasury XLM balance \(1.8 XLM\) is close to the minimum reserve limit/)
    ).toBeInTheDocument();
  });

  it("detects wallet network mismatch when network does not match system expected network", () => {
    useWalletStore.setState({ isConnected: true, network: "PUBLIC" });
    render(<AdminActionQueue />);
    expect(screen.getByText("Critical: Wallet Network Mismatch")).toBeInTheDocument();
    expect(
      screen.getByText(/Connected wallet is on PUBLIC, but the system is configured for TESTNET\./)
    ).toBeInTheDocument();
  });

  it("shows pending funding action when pending transactions exist", () => {
    mockTransactions = [
      {
        id: "tx_999",
        status: "pending",
        totalAmount: 15000,
        employeeCount: 3,
      },
    ];
    render(<AdminActionQueue />);
    expect(screen.getByText("Pending Funding: Payroll Run tx_999")).toBeInTheDocument();
    expect(
      screen.getByText(/Payroll run for \$15,000 with 3 employee\(s\) is awaiting execution\./)
    ).toBeInTheDocument();
  });

  it("allows triggering state sync action for wallet state warning", async () => {
    useWalletStore.setState({ isConnected: true, network: "TESTNET" });
    render(<AdminActionQueue />);
    
    // Stale wallet state warning should be visible initially because walletSynced starts false
    expect(screen.getByText("Warning: Stale Wallet State")).toBeInTheDocument();
    
    const syncButton = screen.getByRole("button", { name: /Sync Wallet State/i });
    expect(syncButton).toBeInTheDocument();
    
    // Click the sync button
    fireEvent.click(syncButton);
    
    // Verify syncing state
    expect(syncButton).toHaveAttribute("disabled");
    
    // Wait for mock timer (1000ms) to resolve the sync
    await waitFor(() => {
      expect(screen.queryByText("Warning: Stale Wallet State")).not.toBeInTheDocument();
    }, { timeout: 1500 });
  });
});
