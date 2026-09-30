import type { AttestationRowInput, CsvParseResult, ParseCsvOptions, UsageCategoryRegistry } from '../types';
import { FORM_FIELDS, REQUIRED_FIELD_IDS } from '../core/formFields';
import { VALID_CATEGORY_IDS } from '../core/categories';
import { parseCaip10 } from '../core/caip';
import { convertChainId } from './chain';
import { validateChain } from './fieldValidators';
import { convertCategoryAlias } from './category';
import { getUsageCategorySuggestions } from './usageCategoryRegistry';
import { convertPaymasterAlias, getSmartPaymasterSuggestions, VALID_PAYMASTER_CATEGORIES } from './paymaster';
import { getProjectValidation, resolveProjectsList } from './project';
import { createDiagnostics, addConversion, addError, addWarning, addSuggestion } from './diagnostics';
import { levenshteinDistance } from './levenshtein';

interface ParsedLine {
  values: string[];
  error?: string;
}

const HEADER_ALIASES: Record<string, string> = {
  originkey: 'chain_id'
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '');
}

function mapHeaderToField(header: string): string | null {
  const normalizedHeader = normalizeHeader(header);
  if (!normalizedHeader) {
    return null;
  }

  if (HEADER_ALIASES[normalizedHeader]) {
    return HEADER_ALIASES[normalizedHeader];
  }

  let bestMatch: string | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  FORM_FIELDS.forEach((field) => {
    const normalizedFieldId = normalizeHeader(field.id);
    const normalizedFieldLabel = normalizeHeader(field.label);

    const idDistance = levenshteinDistance(normalizedHeader, normalizedFieldId);
    if (idDistance < minDistance) {
      minDistance = idDistance;
      bestMatch = field.id;
    }

    const labelDistance = levenshteinDistance(normalizedHeader, normalizedFieldLabel);
    if (labelDistance < minDistance) {
      minDistance = labelDistance;
      bestMatch = field.id;
    }
  });

  const threshold = normalizedHeader.length > 5 ? 2 : 1;
  return minDistance <= threshold ? bestMatch : null;
}

function parseCsvLine(line: string): ParsedLine {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return {
    values: values.map((value) => value.trim())
  };
}

function cleanValue(value: string, fieldId?: string): string {
  let cleaned = value.trim();

  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
  }

  if (fieldId && (fieldId.startsWith('is_') || fieldId === 'track_outflow')) {
    const lower = cleaned.toLowerCase();
    if (['1', 'true', 'yes'].includes(lower)) return 'true';
    if (['0', 'false', 'no'].includes(lower)) return 'false';
  }

  return cleaned;
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

export async function parseCsv(csvText: string, options: ParseCsvOptions = {}): Promise<CsvParseResult> {
  const diagnostics = createDiagnostics();
  const allowedFields = normalizeAllowedFields(options.allowedFields);
  const registry: UsageCategoryRegistry | undefined = options.usageCategoryRegistry;
  const lines = csvText.split('\n').map((line) => line.trim());

  if (lines.length < 2 || lines.slice(1).every((line) => !line)) {
    addError(diagnostics, 'CSV_EMPTY', 'CSV file must contain a header and at least one data row.');
    return { rows: [], columns: [], headerMap: {}, diagnostics };
  }

  const headerResult = parseCsvLine(lines[0]);
  if (headerResult.error) {
    addError(diagnostics, 'CSV_HEADER_PARSE_ERROR', `Error in header row: ${headerResult.error}`);
    return { rows: [], columns: [], headerMap: {}, diagnostics };
  }

  const headers = headerResult.values;
  const headerMap: Record<string, string | null> = {};
  const columns: string[] = [];
  const mappedFields = new Set<string>();

  headers.forEach((header, headerIndex) => {
    const fieldId = mapHeaderToField(header);
    headerMap[header] = fieldId;

    if (!fieldId) {
      if (!allowedFields && header.trim()) {
        addWarning(diagnostics, 'CSV_HEADER_IGNORED', `Column "${header}" was not recognized and will be ignored.`, {
          row: 0,
          field: header,
          metadata: { headerIndex }
        });
      }
      return;
    }

    if (allowedFields && !allowedFields.has(fieldId)) {
      headerMap[header] = null;
      return;
    }

    if (mappedFields.has(fieldId)) {
      addError(
        diagnostics,
        'CSV_DUPLICATE_COLUMN',
        `Duplicate column detected: More than one column maps to the field "${fieldId}".`,
        { row: 0, field: fieldId }
      );
      return;
    }

    mappedFields.add(fieldId);
    columns.push(fieldId);
  });

  if (diagnostics.errors.length > 0) {
    return { rows: [], columns, headerMap, diagnostics };
  }

  const requiredFields = FORM_FIELDS
    .filter((field) => field.required)
    .map((field) => field.id)
    .filter((field) => (allowedFields ? allowedFields.has(field) : true));
  const missingRequired = requiredFields.filter((field) => !columns.includes(field));
  if (missingRequired.length > 0) {
    addError(
      diagnostics,
      'CSV_MISSING_REQUIRED_COLUMNS',
      `Missing required columns: ${missingRequired.join(', ')}`,
      { row: 0 }
    );
    return { rows: [], columns, headerMap, diagnostics };
  }

  const projects = await resolveProjectsList({ projects: options.projects, fetchProjects: options.fetchProjects });
  const rows: AttestationRowInput[] = [];
  const dataLines = lines.slice(1);

  for (let i = 0; i < dataLines.length; i += 1) {
    const line = dataLines[i];
    const lineNumber = i + 2;

    if (!line.trim()) {
      continue;
    }

    const parsed = parseCsvLine(line);
    if (parsed.error) {
      addError(diagnostics, 'CSV_ROW_PARSE_ERROR', `Error on data row ${lineNumber}: ${parsed.error}`, { row: i });
      continue;
    }

    const values = parsed.values;
    if (values.every((value) => value === '')) {
      continue;
    }

    if (values.length > headers.length) {
      addWarning(
        diagnostics,
        'CSV_ROW_EXTRA_CELLS',
        `Row ${lineNumber} has more cells than the header. Extra cells will be ignored.`,
        { row: i }
      );
    }

    const row: AttestationRowInput = {};

    for (let j = 0; j < headers.length; j += 1) {
      const header = headers[j];
      const fieldId = headerMap[header];
      if (!fieldId) {
        continue;
      }

      const rawValue = values[j] ?? '';
      let value = cleanValue(rawValue, fieldId);

      if (fieldId === 'chain_id') {
        const converted = convertChainId(value, options.chainRegistry);
        if (value.trim() && converted !== value) {
          addConversion(diagnostics, 'CHAIN_NORMALIZED', `Chain ID converted: "${value}" -> ${converted || '(empty - invalid chain)'}`, {
            row: i,
            field: fieldId,
            metadata: { original: value, converted }
          });
        }
        value = converted;
      } else if (fieldId === 'usage_category') {
        const converted = convertCategoryAlias(value);
        if (value.trim() && converted !== value) {
          addConversion(diagnostics, 'CATEGORY_ALIAS_CONVERTED', `Usage category converted: "${value}" -> ${converted}`, {
            row: i,
            field: fieldId,
            metadata: { original: value, converted }
          });
        }
        value = converted;
      } else if (fieldId === 'paymaster_category') {
        const converted = convertPaymasterAlias(value);
        if (value.trim() && converted !== value) {
          addConversion(diagnostics, 'PAYMASTER_ALIAS_CONVERTED', `Paymaster category converted: "${value}" -> ${converted}`, {
            row: i,
            field: fieldId,
            metadata: { original: value, converted }
          });
        }
        value = converted;
      }

      row[fieldId] = value;
    }

    const parsedCaip10 = typeof row.address === 'string' ? parseCaip10(row.address, options.chainRegistry) : null;
    if (parsedCaip10) {
      const previousChain = typeof row.chain_id === 'string' ? row.chain_id : '';
      row.address = parsedCaip10.address;
      const isValidChain = !validateChain(parsedCaip10.chainId, options.chainRegistry);

      if (isValidChain && !previousChain) {
        row.chain_id = parsedCaip10.chainId;
        addConversion(
          diagnostics,
          'CAIP_CHAIN_INFERRED',
          `Chain ID set from CAIP-10 address: ${parsedCaip10.chainId}`,
          { row: i, field: 'chain_id', metadata: { fromAddress: true } }
        );
      } else if (isValidChain && previousChain && previousChain !== parsedCaip10.chainId) {
        addError(
          diagnostics,
          'CAIP_CHAIN_MISMATCH',
          `CAIP-10 chain (${parsedCaip10.chainId}) does not match chain_id (${previousChain}).`,
          { row: i, field: 'address' }
        );
      }
    }

    const projectValue = typeof row.owner_project === 'string' ? row.owner_project : '';
    if (projectValue && projects.length > 0) {
      const projectValidation = getProjectValidation(projectValue, projects);
      if (!projectValidation.valid) {
        addError(diagnostics, 'PROJECT_INVALID', `Invalid project ID: "${projectValue}".`, {
          row: i,
          field: 'owner_project',
          suggestions: projectValidation.suggestions,
          metadata: {
            similarProjects: projectValidation.similarProjects
          }
        });

        if (projectValidation.suggestions.length > 0) {
          addSuggestion(
            diagnostics,
            'PROJECT_SUGGESTIONS',
            `Project suggestions for "${projectValue}".`,
            {
              row: i,
              field: 'owner_project',
              suggestions: projectValidation.suggestions,
              metadata: { similarProjects: projectValidation.similarProjects }
            }
          );
        }
      }
    }

    const categoryValue = typeof row.usage_category === 'string' ? row.usage_category : '';
    const categoryIsValid = registry
      ? registry.allowedIds.has(categoryValue)
      : VALID_CATEGORY_IDS.includes(categoryValue);
    if (categoryValue && !categoryIsValid) {
      const suggestions = getUsageCategorySuggestions(categoryValue, registry);
      if (suggestions.length > 0) {
        addSuggestion(
          diagnostics,
          'CATEGORY_SUGGESTIONS',
          `Invalid category: "${categoryValue}". Did you mean one of these?`,
          { row: i, field: 'usage_category', suggestions }
        );
      }
    }

    const paymasterValue = typeof row.paymaster_category === 'string' ? row.paymaster_category : '';
    if (paymasterValue && !VALID_PAYMASTER_CATEGORIES.includes(paymasterValue)) {
      const suggestions = getSmartPaymasterSuggestions(paymasterValue);
      if (suggestions.length > 0) {
        addSuggestion(
          diagnostics,
          'PAYMASTER_SUGGESTIONS',
          `Invalid paymaster category: "${paymasterValue}". Did you mean one of these?`,
          { row: i, field: 'paymaster_category', suggestions }
        );
      }
    }

    rows.push(row);
  }

  return {
    rows,
    columns,
    headerMap,
    diagnostics
  };
}
