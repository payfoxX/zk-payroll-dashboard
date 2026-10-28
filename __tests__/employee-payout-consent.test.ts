import { describe, expect, it } from "vitest";
import {
  validateEmployeePayoutConsent,
  validateBatchEmployeePayoutConsent,
  checkBatchConsentValidity,
  type EmployeePayoutConsentInput,
} from "@/src/payroll/employeePayoutConsent";

describe("validateEmployeePayoutConsent", () => {
  // Success path tests
  describe("successful validation", () => {
    it("validates employee with consent and timestamp", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        employeeName: "John Doe",
        consentGiven: true,
        consentTimestamp: "2024-01-15T10:00:00Z",
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("validates employee with consent and version", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-456",
        consentGiven: true,
        consentVersion: "v2.1",
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("validates employee with minimal required fields", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-789",
        consentGiven: true,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // Failure path tests
  describe("validation failures", () => {
    it("rejects missing employee ID", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "",
        consentGiven: true,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Employee ID is required");
    });

    it("rejects invalid employee ID format", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp@123!",
        consentGiven: true,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("invalid characters");
    });

    it("rejects missing consent", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        consentGiven: false,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("explicit consent");
    });

    it("rejects invalid timestamp format", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        consentGiven: true,
        consentTimestamp: "invalid-date",
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid consent timestamp");
    });

    it("rejects future consent timestamp", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        consentGiven: true,
        consentTimestamp: futureDate.toISOString(),
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("cannot be in the future");
    });

    it("rejects empty consent version", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        consentGiven: true,
        consentVersion: "",
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("non-empty string");
    });
  });

  // Edge case tests
  describe("edge cases", () => {
    it("warns about old consent (>2 years)", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);

      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        consentGiven: true,
        consentTimestamp: oldDate.toISOString(),
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
      expect(result.warning).toContain("over 2 years ago");
    });

    it("warns about missing timestamp", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp-123",
        consentGiven: true,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
      expect(result.warning).toContain("No consent timestamp");
    });

    it("accepts employee ID with hyphens and underscores", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "emp_123-abc",
        consentGiven: true,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
    });

    it("handles whitespace in employee ID", () => {
      const input: EmployeePayoutConsentInput = {
        employeeId: "  emp-123  ",
        consentGiven: true,
      };

      const result = validateEmployeePayoutConsent(input);

      expect(result.isValid).toBe(true);
    });
  });
});

describe("validateBatchEmployeePayoutConsent", () => {
  it("validates multiple employees successfully", () => {
    const inputs: EmployeePayoutConsentInput[] = [
      { employeeId: "emp-1", consentGiven: true },
      { employeeId: "emp-2", consentGiven: true },
      { employeeId: "emp-3", consentGiven: true },
    ];

    const results = validateBatchEmployeePayoutConsent(inputs);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.isValid)).toBe(true);
  });

  it("identifies invalid employees in batch", () => {
    const inputs: EmployeePayoutConsentInput[] = [
      { employeeId: "emp-1", consentGiven: true },
      { employeeId: "", consentGiven: true }, // Invalid
      { employeeId: "emp-3", consentGiven: false }, // Invalid
    ];

    const results = validateBatchEmployeePayoutConsent(inputs);

    expect(results).toHaveLength(3);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
    expect(results[2].isValid).toBe(false);
  });
});

describe("checkBatchConsentValidity", () => {
  it("reports all valid when batch is clean", () => {
    const inputs: EmployeePayoutConsentInput[] = [
      { employeeId: "emp-1", consentGiven: true },
      { employeeId: "emp-2", consentGiven: true },
    ];

    const check = checkBatchConsentValidity(inputs);

    expect(check.allValid).toBe(true);
    expect(check.invalidCount).toBe(0);
    expect(check.invalidEmployeeIds).toHaveLength(0);
    expect(check.errors).toHaveLength(0);
  });

  it("reports invalid employees with details", () => {
    const inputs: EmployeePayoutConsentInput[] = [
      { employeeId: "emp-1", consentGiven: true },
      { employeeId: "emp-2", consentGiven: false },
      { employeeId: "", consentGiven: true },
    ];

    const check = checkBatchConsentValidity(inputs);

    expect(check.allValid).toBe(false);
    expect(check.invalidCount).toBe(2);
    expect(check.invalidEmployeeIds).toContain("emp-2");
    expect(check.invalidEmployeeIds).toContain("");
    expect(check.errors).toHaveLength(2);
    expect(check.errors[0]).toContain("emp-2");
  });

  it("handles empty batch", () => {
    const inputs: EmployeePayoutConsentInput[] = [];

    const check = checkBatchConsentValidity(inputs);

    expect(check.allValid).toBe(true);
    expect(check.invalidCount).toBe(0);
  });
});
