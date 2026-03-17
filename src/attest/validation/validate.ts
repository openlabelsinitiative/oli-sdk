import type {
  AttestationDiagnostics,
  AttestationRowInput,
  BulkValidationResult,
  ProjectRecord,
  SingleValidationResult,
  UsageCategoryRegistry,
  ValidationOptions
} from '../types';
import { FORM_FIELDS, REQUIRED_FIELD_IDS } from '../core/formFields';
import { resolveModeProfile } from '../core/profiles';
import { parseCaip10 } from '../core/caip';
import { createDiagnostics, addConversion, addError, addSuggestion, addWarning, mergeDiagnostics } from './diagnostics';
import {
  validateAddress,
  validateAddressForChain,
  validateBoolean,
  validateCategory,
  validateChain,
  validateContractName,
  validatePaymasterCategory,
  validateTxHash,
  validateURL
} from './fieldValidators';
import { convertCategoryAlias } from './category';
import { getUsageCategorySuggestions } from './usageCategoryRegistry';
import { convertPaymasterAlias, getSmartPaymasterSuggestions, VALID_PAYMASTER_CATEGORIES } from './paymaster';
import { getProjectValidation, resolveProjectsList } from './project';

const FIELD_DEFINITIONS = new Map(FORM_FIELDS.map((field) => [field.id, field]));

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function cloneRow(row: AttestationRowInput): AttestationRowInput {
  return { ...row };
}

function normalizeAllowedFields(allowedFields: string[] | undefined): Set<string> | null {
  if (!Array.isArray(allowedFields) || allowedFields.length === 0) {
    return null;
  }

  const normalized = new Set(
    allowedFields
      .map((field) => field.trim())
      .filter((field) => field.length > 0)
  );

  REQUIRED_FIELD_IDS.forEach((field) => normalized.add(field));
  return normalized;
}

function sanitizeRowByAllowedFields(row: AttestationRowInput, allowedFields: Set<string> | null): AttestationRowInput {
  if (!allowedFields) {
    return row;
  }

  Object.keys(row).forEach((fieldId) => {
    if (!allowedFields.has(fieldId)) {
      delete row[fieldId];
    }
  });

  return row;
}

function isBooleanField(fieldId: string): boolean {
  const field = FIELD_DEFINITIONS.get(fieldId);
  return field?.type === 'radio' || fieldId.startsWith('is_') || fieldId === 'track_outflow';
}

function normalizeFieldValue(fieldId: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(',');
  }

  const normalized = String(value ?? '').trim();
  if (isBooleanField(fieldId)) {
    const lower = normalized.toLowerCase();
    if (['1', 'yes', 'true'].includes(lower)) return 'true';
    if (['0', 'no', 'false'].includes(lower)) return 'false';
  }
  return normalized;
}

function applyCaipNormalization(row: AttestationRowInput, diagnostics: AttestationDiagnostics, rowIndex?: number): void {
  const addressValue = typeof row.address === 'string' ? row.address : '';
  const parsed = parseCaip10(addressValue);
  if (!parsed) {
    return;
  }

  const previousChain = typeof row.chain_id === 'string' ? row.chain_id : '';
  row.address = parsed.address;

  if (parsed.isKnownChain && !previousChain) {
    row.chain_id = parsed.chainId;
    addConversion(diagnostics, 'CAIP_CHAIN_INFERRED', `Chain ID set from CAIP-10 address: ${parsed.chainId}`, {
      row: rowIndex,
      field: 'chain_id'
    });
    return;
  }

  if (parsed.isKnownChain && previousChain && previousChain !== parsed.chainId) {
    addError(
      diagnostics,
      'CAIP_CHAIN_MISMATCH',
      `CAIP-10 chain (${parsed.chainId}) does not match chain_id (${previousChain}).`,
      { row: rowIndex, field: 'address' }
    );
  }
}

async function validateProject(
  row: AttestationRowInput,
  diagnostics: AttestationDiagnostics,
  projects: ProjectRecord[],
  rowIndex?: number
): Promise<void> {
  const projectValue = typeof row.owner_project === 'string' ? row.owner_project : '';
  if (!projectValue || projects.length === 0) {
    return;
  }

  const validation = getProjectValidation(projectValue, projects);
  if (validation.valid) {
    return;
  }

  addError(diagnostics, 'PROJECT_INVALID', `Invalid project ID: "${projectValue}".`, {
    row: rowIndex,
    field: 'owner_project',
    suggestions: validation.suggestions,
    metadata: {
      similarProjects: validation.similarProjects
    }
  });

  if (validation.suggestions.length > 0) {
    addSuggestion(diagnostics, 'PROJECT_SUGGESTIONS', `Project suggestions for "${projectValue}".`, {
      row: rowIndex,
      field: 'owner_project',
      suggestions: validation.suggestions,
      metadata: {
        similarProjects: validation.similarProjects
      }
    });
  }
}

function validateCategoryFieldValue(
  row: AttestationRowInput,
  diagnostics: AttestationDiagnostics,
  rowIndex?: number,
  registry?: UsageCategoryRegistry
): void {
  const value = typeof row.usage_category === 'string' ? row.usage_category : '';
  if (!value) {
    return;
  }

  const validationError = validateCategory(value, registry);
  if (!validationError) {
    return;
  }

  const converted = convertCategoryAlias(value);
  // Only suggest the alias if its target is valid within the (possibly filtered) registry
  if (converted !== value && !validateCategory(converted, registry)) {
    addConversion(
      diagnostics,
      'CATEGORY_ALIAS_SUGGESTION',
      `"${value}" might be "${converted}".`,
      {
        row: rowIndex,
        field: 'usage_category',
        suggestion: converted,
        suggestions: [converted]
      }
    );
    addSuggestion(
      diagnostics,
      'CATEGORY_ALIAS_SUGGESTION',
      `"${value}" might be "${converted}".`,
      {
        row: rowIndex,
        field: 'usage_category',
        suggestion: converted,
        suggestions: [converted]
      }
    );
    return;
  }

  const suggestions = getUsageCategorySuggestions(value, registry);
  // Fall back to 'other' only when no registry is active (static mode)
  const suggestionList = suggestions.length > 0 ? suggestions : (registry ? [] : ['other']);
  addError(diagnostics, 'CATEGORY_INVALID', validationError, {
    row: rowIndex,
    field: 'usage_category',
    suggestions: suggestionList
  });
  if (suggestionList.length > 0) {
    addSuggestion(diagnostics, 'CATEGORY_SUGGESTIONS', `Invalid category: "${value}".`, {
      row: rowIndex,
      field: 'usage_category',
      suggestions: suggestionList
    });
  }
}

function validatePaymasterFieldValue(
  row: AttestationRowInput,
  diagnostics: AttestationDiagnostics,
  rowIndex?: number
): void {
  const value = typeof row.paymaster_category === 'string' ? row.paymaster_category : '';
  if (!value) {
    return;
  }

  const validationError = validatePaymasterCategory(value);
  if (!validationError) {
    return;
  }

  const converted = convertPaymasterAlias(value);
  if (converted !== value && VALID_PAYMASTER_CATEGORIES.includes(converted)) {
    addConversion(
      diagnostics,
      'PAYMASTER_ALIAS_SUGGESTION',
      `"${value}" might be "${converted}".`,
      {
        row: rowIndex,
        field: 'paymaster_category',
        suggestion: converted,
        suggestions: [converted]
      }
    );
    addSuggestion(
      diagnostics,
      'PAYMASTER_ALIAS_SUGGESTION',
      `"${value}" might be "${converted}".`,
      {
        row: rowIndex,
        field: 'paymaster_category',
        suggestion: converted,
        suggestions: [converted]
      }
    );
    return;
  }

  const suggestions = getSmartPaymasterSuggestions(value);
  const suggestionList = suggestions.length > 0 ? suggestions : ['verifying'];
  addError(diagnostics, 'PAYMASTER_INVALID', validationError, {
    row: rowIndex,
    field: 'paymaster_category',
    suggestions: suggestionList
  });
  addSuggestion(diagnostics, 'PAYMASTER_SUGGESTIONS', `Invalid paymaster category: "${value}".`, {
    row: rowIndex,
    field: 'paymaster_category',
    suggestions: suggestionList
  });
}

function validateFieldValue(
  row: AttestationRowInput,
  fieldId: string,
  diagnostics: AttestationDiagnostics,
  rowIndex?: number
): void {
  const value = row[fieldId];
  if (isEmptyValue(value)) {
    return;
  }

  const normalized = normalizeFieldValue(fieldId, value);

  if (fieldId === 'chain_id') {
    const chainError = validateChain(normalized);
    if (chainError) {
      addError(diagnostics, 'CHAIN_INVALID', chainError, { row: rowIndex, field: fieldId });
    }
    return;
  }

  if (fieldId === 'address') {
    const addressError = validateAddressForChain(normalized, typeof row.chain_id === 'string' ? row.chain_id : undefined);
    if (addressError) {
      addError(diagnostics, 'ADDRESS_INVALID', addressError, { row: rowIndex, field: fieldId });
    }
    return;
  }

  if (fieldId === 'contract_name') {
    const error = validateContractName(normalized);
    if (error) {
      addError(diagnostics, 'CONTRACT_NAME_INVALID', error, { row: rowIndex, field: fieldId });
    }
    return;
  }

  if (fieldId === 'deployment_tx') {
    const error = validateTxHash(normalized);
    if (error) {
      addError(diagnostics, 'TX_HASH_INVALID', error, { row: rowIndex, field: fieldId });
    }
    return;
  }

  if (fieldId === 'deployer_address') {
    const error = normalized ? validateAddress(normalized) : '';
    if (error) {
      addError(diagnostics, 'DEPLOYER_ADDRESS_INVALID', error, { row: rowIndex, field: fieldId });
    }
    return;
  }

  if (fieldId === 'contract_monitored') {
    const error = validateURL(normalized);
    if (error) {
      addError(diagnostics, 'URL_INVALID', error, { row: rowIndex, field: fieldId });
    }
    return;
  }

  if (isBooleanField(fieldId)) {
    const error = validateBoolean(normalized);
    if (error) {
      addError(diagnostics, 'BOOLEAN_INVALID', error, { row: rowIndex, field: fieldId });
    }
  }
}

async function validateRow(
  rowInput: AttestationRowInput,
  diagnostics: AttestationDiagnostics,
  options: {
    mode: ReturnType<typeof resolveModeProfile>;
    projects: ProjectRecord[];
    allowedFields: Set<string> | null;
    rowIndex?: number;
    registry?: UsageCategoryRegistry;
  }
): Promise<AttestationRowInput> {
  const row = sanitizeRowByAllowedFields(cloneRow(rowInput), options.allowedFields);
  const { mode, projects, rowIndex, registry } = options;

  applyCaipNormalization(row, diagnostics, rowIndex);

  Object.entries(row).forEach(([fieldId, value]) => {
    if (isEmptyValue(value)) {
      return;
    }

    if (!mode.allowedFields.includes(fieldId)) {
      addWarning(
        diagnostics,
        'FIELD_NOT_IN_MODE',
        `Field "${fieldId}" is not part of ${mode.id} and may be ignored by profile-constrained UIs.`,
        { row: rowIndex, field: fieldId }
      );
    }
  });

  mode.requiresFields.forEach((requiredField) => {
    if (isEmptyValue(row[requiredField])) {
      const label = FIELD_DEFINITIONS.get(requiredField)?.label ?? requiredField;
      addError(diagnostics, 'REQUIRED_FIELD_MISSING', `${label} is required`, {
        row: rowIndex,
        field: requiredField
      });
    }
  });

  Object.keys(row).forEach((fieldId) => {
    validateFieldValue(row, fieldId, diagnostics, rowIndex);
  });

  await validateProject(row, diagnostics, projects, rowIndex);
  validateCategoryFieldValue(row, diagnostics, rowIndex, registry);
  validatePaymasterFieldValue(row, diagnostics, rowIndex);

  return row;
}

export async function validateSingle(input: AttestationRowInput, options: ValidationOptions = {}): Promise<SingleValidationResult> {
  const diagnostics = createDiagnostics();
  const mode = resolveModeProfile(options.mode);
  const projects = await resolveProjectsList({ projects: options.projects, fetchProjects: options.fetchProjects });
  const allowedFields = normalizeAllowedFields(options.allowedFields);

  const row = await validateRow(input, diagnostics, {
    mode,
    projects,
    allowedFields,
    registry: options.usageCategoryRegistry
  });

  return {
    valid: diagnostics.errors.length === 0,
    row,
    diagnostics
  };
}

function isCompletelyEmptyRow(row: AttestationRowInput): boolean {
  return Object.values(row).every((value) => isEmptyValue(value));
}

function hasRowErrors(diagnostics: AttestationDiagnostics, rowIndex: number): boolean {
  return diagnostics.errors.some((error) => error.row === rowIndex);
}

export async function validateBulk(rows: AttestationRowInput[], options: ValidationOptions = {}): Promise<BulkValidationResult> {
  const diagnostics = createDiagnostics();
  const mode = resolveModeProfile(options.mode);
  const projects = await resolveProjectsList({ projects: options.projects, fetchProjects: options.fetchProjects });
  const allowedFields = normalizeAllowedFields(options.allowedFields);
  const registry = options.usageCategoryRegistry;

  if (!Array.isArray(rows) || rows.length === 0) {
    addError(diagnostics, 'BULK_EMPTY', 'At least one row is required for bulk attestation.');
    return {
      valid: false,
      rows: [],
      validRows: [],
      invalidRows: [],
      diagnostics
    };
  }

  const normalizedRows: AttestationRowInput[] = [];
  const validRows: AttestationRowInput[] = [];
  const invalidRows: number[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (rows.length > 1 && isCompletelyEmptyRow(row)) {
      normalizedRows.push(cloneRow(row));
      continue;
    }

    const rowDiagnostics = createDiagnostics();
    const normalizedRow = await validateRow(row, rowDiagnostics, {
      mode,
      projects,
      allowedFields,
      rowIndex: index,
      registry
    });

    normalizedRows.push(normalizedRow);
    mergeDiagnostics(diagnostics, rowDiagnostics);

    if (hasRowErrors(rowDiagnostics, index)) {
      invalidRows.push(index);
    } else {
      validRows.push(normalizedRow);
    }
  }

  const maxRows = options.maxRows ?? 50;
  if (validRows.length > maxRows) {
    addError(
      diagnostics,
      'BULK_ROW_LIMIT_EXCEEDED',
      `You can only submit up to ${maxRows} attestations at once. You currently have ${validRows.length} valid rows.`,
      { metadata: { maxRows, validRows: validRows.length } }
    );
  }

  return {
    valid: diagnostics.errors.length === 0,
    rows: normalizedRows,
    validRows,
    invalidRows,
    diagnostics
  };
}
