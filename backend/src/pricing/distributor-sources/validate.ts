export interface RegisterDistributorSourceInput {
  vendorName?: string;
  distributorName?: string;
  sourceUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDistributorSourceInput(
  input: Partial<RegisterDistributorSourceInput>,
): ValidationResult {
  const errors: string[] = [];

  if (!input.vendorName?.trim()) errors.push('vendorName is required');
  if (!input.distributorName?.trim()) errors.push('distributorName is required');
  if (!input.sourceUrl?.trim()) {
    errors.push('sourceUrl is required');
  } else {
    try {
      new URL(input.sourceUrl);
    } catch {
      errors.push('sourceUrl must be a valid URL');
    }
  }

  return { valid: errors.length === 0, errors };
}
