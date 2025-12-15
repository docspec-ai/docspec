/**
 * Result of validating a docspec file
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Metadata about a docspec section
 */
export interface DocspecSection {
  name: string;
  content: string;
  lineNumber: number;
}

