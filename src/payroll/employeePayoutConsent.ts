/**
 * Employee Payout Consent Validation
 *
 * Validates that employees have provided explicit consent to receive payouts
 * before processing payroll. Ensures privacy-safe handling and operational visibility.
 *
 * Issue #717
 */

export interface EmployeePayoutConsentInput {
  /** Unique employee identifier */
  employeeId: string;
  /** Employee's full name for verification */
  employeeName?: string;
  /** Whether employee has explicitly consented */
  consentGiven: boolean;
  /** Timestamp when consent was recorded (ISO 8601) */
  consentTimestamp?: string;
  /** Optional consent version/policy identifier */
  consentVersion?: string;
}

export interface EmployeePayoutConsentResult {
  /** Whether consent validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  error: string | null;
  /** Warning message (non-blocking) */
  warning: string | null;
}

/**
 * Validates employee payout consent before processing payroll.
 *
 * @param input - Employee consent information
 * @returns Validation result with status and any errors/warnings
 *
 * @example
 * ```typescript
 * const result = validateEmployeePayoutConsent({
 *   employeeId: "emp-123",
 *   employeeName: "John Doe",
 *   consentGiven: true,
 *   consentTimestamp: "2024-01-15T10:00:00Z",
 * });
 *
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateEmployeePayoutConsent(
  input: EmployeePayoutConsentInput,
): EmployeePayoutConsentResult {
  // Validate employee ID
  if (!input.employeeId || !input.employeeId.trim()) {
    return {
      isValid: false,
      error: "Employee ID is required for payout consent validation.",
      warning: null,
    };
  }

  // Validate employee ID format (alphanumeric, hyphens, underscores)
  const employeeIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!employeeIdPattern.test(input.employeeId.trim())) {
    return {
      isValid: false,
      error: "Employee ID contains invalid characters. Use alphanumeric, hyphens, or underscores only.",
      warning: null,
    };
  }

  // Check for explicit consent
  if (!input.consentGiven) {
    return {
      isValid: false,
      error: "Employee must provide explicit consent before receiving payouts.",
      warning: null,
    };
  }

  // Validate consent timestamp if provided
  let warning: string | null = null;
  if (input.consentTimestamp) {
    const timestamp = new Date(input.consentTimestamp);
    if (isNaN(timestamp.getTime())) {
      return {
        isValid: false,
        error: "Invalid consent timestamp format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00Z).",
        warning: null,
      };
    }

    // Warn if consent is very old (>2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (timestamp < twoYearsAgo) {
      warning = "Consent was recorded over 2 years ago. Consider re-confirming employee consent.";
    }

    // Error if consent is in the future
    if (timestamp > new Date()) {
      return {
        isValid: false,
        error: "Consent timestamp cannot be in the future.",
        warning: null,
      };
    }
  } else {
    // Warn if no timestamp provided (missing audit trail)
    warning = "No consent timestamp provided. Recording timestamps improves audit trails.";
  }

  // Validate consent version if provided
  if (input.consentVersion !== undefined) {
    if (typeof input.consentVersion !== "string" || !input.consentVersion.trim()) {
      return {
        isValid: false,
        error: "Consent version must be a non-empty string if provided.",
        warning: null,
      };
    }
  }

  return {
    isValid: true,
    error: null,
    warning,
  };
}

/**
 * Batch validate multiple employees' payout consent.
 *
 * @param inputs - Array of employee consent information
 * @returns Array of validation results in the same order
 */
export function validateBatchEmployeePayoutConsent(
  inputs: EmployeePayoutConsentInput[],
): EmployeePayoutConsentResult[] {
  return inputs.map((input) => validateEmployeePayoutConsent(input));
}

/**
 * Check if any employees in a batch have invalid consent.
 *
 * @param inputs - Array of employee consent information
 * @returns Object with invalid count and employee IDs
 */
export function checkBatchConsentValidity(
  inputs: EmployeePayoutConsentInput[],
): {
  allValid: boolean;
  invalidCount: number;
  invalidEmployeeIds: string[];
  errors: string[];
} {
  const results = validateBatchEmployeePayoutConsent(inputs);
  const invalidResults = results
    .map((result, index) => ({ result, input: inputs[index] }))
    .filter(({ result }) => !result.isValid);

  return {
    allValid: invalidResults.length === 0,
    invalidCount: invalidResults.length,
    invalidEmployeeIds: invalidResults.map(({ input }) => input.employeeId),
    errors: invalidResults
      .map(({ result, input }) => `${input.employeeId}: ${result.error}`)
      .filter((error): error is string => error !== null),
  };
}
