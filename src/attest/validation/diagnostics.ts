import type { AttestationDiagnostic, AttestationDiagnostics } from '../types';

export const DIAGNOSTIC_CODES = {
  // Validation
  CAIP_CHAIN_INFERRED: 'CAIP_CHAIN_INFERRED',
  CAIP_CHAIN_MISMATCH: 'CAIP_CHAIN_MISMATCH',
  PROJECT_INVALID: 'PROJECT_INVALID',
  PROJECT_SUGGESTIONS: 'PROJECT_SUGGESTIONS',
  CATEGORY_ALIAS_SUGGESTION: 'CATEGORY_ALIAS_SUGGESTION',
  CATEGORY_INVALID: 'CATEGORY_INVALID',
  CATEGORY_SUGGESTIONS: 'CATEGORY_SUGGESTIONS',
  PAYMASTER_ALIAS_SUGGESTION: 'PAYMASTER_ALIAS_SUGGESTION',
  PAYMASTER_INVALID: 'PAYMASTER_INVALID',
  PAYMASTER_SUGGESTIONS: 'PAYMASTER_SUGGESTIONS',
  CHAIN_INVALID: 'CHAIN_INVALID',
  ADDRESS_INVALID: 'ADDRESS_INVALID',
  CONTRACT_NAME_INVALID: 'CONTRACT_NAME_INVALID',
  TX_HASH_INVALID: 'TX_HASH_INVALID',
  DEPLOYER_ADDRESS_INVALID: 'DEPLOYER_ADDRESS_INVALID',
  URL_INVALID: 'URL_INVALID',
  BOOLEAN_INVALID: 'BOOLEAN_INVALID',
  FIELD_NOT_IN_MODE: 'FIELD_NOT_IN_MODE',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  BULK_EMPTY: 'BULK_EMPTY',
  BULK_ROW_LIMIT_EXCEEDED: 'BULK_ROW_LIMIT_EXCEEDED',
  // CSV
  CSV_EMPTY: 'CSV_EMPTY',
  CSV_HEADER_PARSE_ERROR: 'CSV_HEADER_PARSE_ERROR',
  CSV_HEADER_IGNORED: 'CSV_HEADER_IGNORED',
  CSV_DUPLICATE_COLUMN: 'CSV_DUPLICATE_COLUMN',
  CSV_MISSING_REQUIRED_COLUMNS: 'CSV_MISSING_REQUIRED_COLUMNS',
  CSV_ROW_PARSE_ERROR: 'CSV_ROW_PARSE_ERROR',
  CSV_ROW_EXTRA_CELLS: 'CSV_ROW_EXTRA_CELLS',
  CHAIN_NORMALIZED: 'CHAIN_NORMALIZED',
  CATEGORY_ALIAS_CONVERTED: 'CATEGORY_ALIAS_CONVERTED',
  PAYMASTER_ALIAS_CONVERTED: 'PAYMASTER_ALIAS_CONVERTED',
} as const;

export type DiagnosticCode = typeof DIAGNOSTIC_CODES[keyof typeof DIAGNOSTIC_CODES];

interface DiagnosticPointer {
  row?: number;
  field?: string;
  suggestion?: string;
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

export function createDiagnostics(): AttestationDiagnostics {
  return {
    errors: [],
    warnings: [],
    conversions: [],
    suggestions: []
  };
}

function makeDiagnostic(code: string, message: string, pointer: DiagnosticPointer = {}): AttestationDiagnostic {
  return {
    code,
    message,
    ...pointer
  };
}

export function addError(
  diagnostics: AttestationDiagnostics,
  code: string,
  message: string,
  pointer: DiagnosticPointer = {}
): AttestationDiagnostic {
  const diagnostic = makeDiagnostic(code, message, pointer);
  diagnostics.errors.push(diagnostic);
  return diagnostic;
}

export function addWarning(
  diagnostics: AttestationDiagnostics,
  code: string,
  message: string,
  pointer: DiagnosticPointer = {}
): AttestationDiagnostic {
  const diagnostic = makeDiagnostic(code, message, pointer);
  diagnostics.warnings.push(diagnostic);
  return diagnostic;
}

export function addConversion(
  diagnostics: AttestationDiagnostics,
  code: string,
  message: string,
  pointer: DiagnosticPointer = {}
): AttestationDiagnostic {
  const diagnostic = makeDiagnostic(code, message, pointer);
  diagnostics.conversions.push(diagnostic);
  return diagnostic;
}

export function addSuggestion(
  diagnostics: AttestationDiagnostics,
  code: string,
  message: string,
  pointer: DiagnosticPointer = {}
): AttestationDiagnostic {
  const diagnostic = makeDiagnostic(code, message, pointer);
  diagnostics.suggestions.push(diagnostic);
  return diagnostic;
}

export function mergeDiagnostics(target: AttestationDiagnostics, incoming: AttestationDiagnostics): AttestationDiagnostics {
  target.errors.push(...incoming.errors);
  target.warnings.push(...incoming.warnings);
  target.conversions.push(...incoming.conversions);
  target.suggestions.push(...incoming.suggestions);
  return target;
}

export function hasErrors(diagnostics: AttestationDiagnostics): boolean {
  return diagnostics.errors.length > 0;
}
