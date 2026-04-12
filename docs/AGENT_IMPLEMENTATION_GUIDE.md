# OLI SDK v0.1.2 — Agent Implementation Guide

> **Purpose:** This is a self-contained prompt for an AI coding agent to apply the v0.1.2 developer-experience changes to the `@openlabels/oli-sdk` repository. Read every section before writing any code. Execute changes in the order given. Verify with the commands in the final section.

---

## Repository Context

```
Package:   @openlabels/oli-sdk
Version:   0.1.2
Language:  TypeScript (strict)
Bundler:   tsup v8 (CJS + ESM dual output)
Test runner: tsx --test
Node min:  >=16
```

**Subpath entry points** (already exist before these changes):
```
src/index.ts               →  @openlabels/oli-sdk
src/attest.entry.ts        →  @openlabels/oli-sdk/attest
src/attest-ui.entry.ts     →  @openlabels/oli-sdk/attest-ui
src/projects.entry.ts      →  @openlabels/oli-sdk/projects
src/contributions.entry.ts →  @openlabels/oli-sdk/contributions
src/react.ts               →  @openlabels/oli-sdk/react
```

**New subpaths to add** (part of this task):
```
src/validation.entry.ts    →  @openlabels/oli-sdk/validation
src/chains.entry.ts        →  @openlabels/oli-sdk/chains
```

---

## Change 1 — `tsup.config.ts`

Apply both edits in one pass.

**1a.** Change `dts: true` to `dts: { resolve: true }`.

**1b.** Add two new entries to the `entry` array.

Final file must look exactly like this:

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/react.ts',
    'src/attest.entry.ts',
    'src/projects.entry.ts',
    'src/attest-ui.entry.ts',
    'src/contributions.entry.ts',
    'src/validation.entry.ts',
    'src/chains.entry.ts'
  ],
  format: ['cjs', 'esm'],
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ['js-yaml'],
  platform: 'browser',
  target: 'es2020',
  minify: false,
  treeshake: true,
});
```

---

## Change 2 — `package.json`

Apply three edits:

**2a.** `"files"` array: add `"src"`.
```json
"files": ["dist", "src"]
```

**2b.** Add `test:types` script (insert before `prepublishOnly`):
```json
"test:types": "tsc --noEmit -p tests/consumer/tsconfig.json",
```

**2c.** Add `/validation` and `/chains` to the `"exports"` map (append after `"./react"` block):
```json
"./validation": {
  "types": "./dist/validation.entry.d.ts",
  "import": "./dist/validation.entry.mjs",
  "require": "./dist/validation.entry.js"
},
"./chains": {
  "types": "./dist/chains.entry.d.ts",
  "import": "./dist/chains.entry.mjs",
  "require": "./dist/chains.entry.js"
}
```

---

## Change 3 — `src/attest/validation/diagnostics.ts`

Prepend the following constant and type **after the existing import line** (keep all existing functions unchanged):

```ts
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
```

---

## Change 4 — `src/attest.entry.ts`

Current content: `export * from './attest';`

Replace with:
```ts
export * from './attest';
export { DIAGNOSTIC_CODES } from './attest/validation/diagnostics';
export type { DiagnosticCode } from './attest/validation/diagnostics';
```

---

## Change 5 — `src/index.ts`

Find the line:
```ts
export { AttestValidationError } from './attest';
```

Append immediately after it:
```ts
export { DIAGNOSTIC_CODES } from './attest/validation/diagnostics';
export type { DiagnosticCode } from './attest/validation/diagnostics';
```

---

## Change 6 — New file `src/validation.entry.ts`

Create this file (do not create if it exists):

```ts
/**
 * @openlabels/oli-sdk — `/validation` subpath
 *
 * Field-level validators and diagnostic code constants for use in custom UI
 * or server-side pre-processing before calling the attestation API.
 */

export {
  isValidEvmAddress,
  validateAddress,
  validateAddressForChain,
  validateContractName,
  validateTxHash,
  validateURL,
  validateBoolean,
  validateChain,
  validateCategory,
  validatePaymasterCategory
} from './attest/validation/fieldValidators';

export { DIAGNOSTIC_CODES } from './attest/validation/diagnostics';
export type { DiagnosticCode } from './attest/validation/diagnostics';
```

---

## Change 7 — New file `src/chains.entry.ts`

Create this file:

```ts
/**
 * @openlabels/oli-sdk — `/chains` subpath
 *
 * Chain metadata, CAIP-2/CAIP-10 utilities, address helpers, and category
 * data used internally by the attestation pipeline. Re-exported here so
 * consumers can build matching UI or server-side logic without duplicating
 * these constants.
 */

// Chain metadata
export { CHAINS, CHAIN_OPTIONS, CHAIN_ALIASES } from './attest/core/chains';
export type { ChainMetadata } from './attest/core/chains';

// Chain ID conversion/normalization (from validation layer)
export { convertChainId } from './attest/validation/chain';

// CAIP-10 utilities
export { parseCaip10, buildCaip10, normalizeChainId } from './attest/core/caip';
export type { Caip10Parts } from './attest/core/caip';

// EVM address utilities
export { isValidEvmAddress, toChecksumAddress } from './attest/core/address';

// Category metadata
export { CATEGORIES, VALID_CATEGORY_IDS } from './attest/core/categories';
export type { Category, MainCategory } from './attest/core/categories';

// Category alias conversion (from validation layer)
export { convertCategoryAlias } from './attest/validation/category';
```

---

## Change 8 — `src/attest/react/uiTypes.ts` (full rewrite)

Replace the entire file with the following content. Do not preserve any of the old content — the interfaces are being restructured from flat to nested namespaces.

```ts
import type { AttestClient } from '../api';
import type { FormFieldDefinition } from '../core/formFields';
import type {
  AttestationDiagnostics,
  AttestationDiagnostic,
  AttestationFieldValue,
  AttestationModeProfileName,
  AttestationRowInput,
  BulkOnchainSubmitResult,
  BulkValidationResult,
  CsvParseResult,
  OnchainSubmitResult,
  OnchainWalletAdapter,
  ParseCsvOptions,
  PrepareSingleOptions,
  PreparedAttestation,
  SingleValidationResult,
  ValidationOptions
} from '../types';

/** Options accepted by `useSingleAttestUI`. */
export interface SingleAttestUIOptions {
  /** Initial attestation mode. Defaults to `'simpleProfile'`. */
  mode?: AttestationModeProfileName;
  /** Pre-populated row data shown when the hook mounts. */
  initialRow?: AttestationRowInput;
  /** Wallet adapter used for onchain submission. Can be overridden per call. */
  walletAdapter?: OnchainWalletAdapter;
  /** Restrict the visible field list to these field IDs. */
  includeFields?: string[];
  /** Hide these field IDs from the visible field list. */
  excludeFields?: string[];
  /** Default validation options merged into every `validation.run()` call. */
  validationOptions?: Omit<ValidationOptions, 'mode'>;
  /** Default prepare options merged into every `submission.prepare()` call. */
  prepareOptions?: Omit<PrepareSingleOptions, 'mode'>;
  /** Called after a successful `validation.run()`. */
  onValidated?: (result: SingleValidationResult) => void;
  /** Called after a successful `submission.submit()`. */
  onSubmitted?: (result: OnchainSubmitResult) => void;
}

/** Options accepted by `useBulkCsvAttestUI`. */
export interface BulkCsvAttestUIOptions {
  /** Initial attestation mode. Defaults to `'advancedProfile'`. */
  mode?: AttestationModeProfileName;
  /** Pre-populated rows shown when the hook mounts. */
  initialRows?: AttestationRowInput[];
  /** Pre-populated column order. */
  initialColumns?: string[];
  /** Wallet adapter used for onchain submission. Can be overridden per call. */
  walletAdapter?: OnchainWalletAdapter;
  /** Restrict the visible field list to these field IDs. */
  includeFields?: string[];
  /** Hide these field IDs from the visible field list. */
  excludeFields?: string[];
  /**
   * Lock the editable columns to this explicit set. Required fields are
   * always included even if omitted here.
   */
  allowedFields?: string[];
  /** Default CSV parse options merged into every `csv.parse()` call. */
  parseOptions?: Omit<ParseCsvOptions, 'mode'>;
  /** Default validation options merged into every `validation.run()` call. */
  validationOptions?: Omit<ValidationOptions, 'mode'>;
  /** Called after a successful `csv.parse()`. */
  onParsed?: (result: CsvParseResult) => void;
  /** Called after a successful `validation.run()`. */
  onValidated?: (result: BulkValidationResult) => void;
  /** Called after a successful `submission.submit()`. */
  onSubmitted?: (result: BulkOnchainSubmitResult) => void;
}

/** Diagnostics namespace on `SingleAttestUIController`. */
export interface SingleDiagnosticsController {
  /** All diagnostics produced by the last `validation.run()`. */
  all: AttestationDiagnostics;
  applySuggestion(field: string, suggestion: string): void;
  applyFromDiagnostic(diagnostic: AttestationDiagnostic, fallback?: string): void;
}

/** Validation namespace on `SingleAttestUIController`. */
export interface SingleValidationController {
  run(overrides?: Omit<ValidationOptions, 'mode'>): Promise<SingleValidationResult>;
  result: SingleValidationResult | null;
  isRunning: boolean;
  error: Error | null;
}

/** Submission namespace on `SingleAttestUIController`. */
export interface SingleSubmissionController {
  prepare(overrides?: Omit<PrepareSingleOptions, 'mode'>): Promise<PreparedAttestation>;
  submit(walletAdapter?: OnchainWalletAdapter, overrides?: Omit<PrepareSingleOptions, 'mode'>): Promise<OnchainSubmitResult>;
  result: OnchainSubmitResult | null;
  isSubmitting: boolean;
  error: Error | null;
}

/**
 * Controller returned by `useSingleAttestUI`.
 * @example
 * ```tsx
 * const { mode, setMode, row, setField, diagnostics, validation, submission, reset } =
 *   useSingleAttestUI(attest, { mode: 'simpleProfile' });
 * ```
 */
export interface SingleAttestUIController {
  mode: AttestationModeProfileName;
  setMode(mode: AttestationModeProfileName): void;
  row: AttestationRowInput;
  fields: FormFieldDefinition[];
  setRow(row: AttestationRowInput): void;
  setField(field: string, value: AttestationFieldValue): void;
  diagnostics: SingleDiagnosticsController;
  validation: SingleValidationController;
  submission: SingleSubmissionController;
  reset(row?: AttestationRowInput): void;
}

/** Queue namespace on `BulkCsvAttestUIController`. */
export interface BulkQueueController {
  rows: AttestationRowInput[];
  columns: string[];
  setRows(rows: AttestationRowInput[]): void;
  setColumns(cols: string[]): void;
  setCell(rowIndex: number, field: string, value: AttestationFieldValue): void;
  addRow(row?: AttestationRowInput): void;
  removeRow(rowIndex: number): void;
}

/** Diagnostics namespace on `BulkCsvAttestUIController`. */
export interface BulkDiagnosticsController {
  all: AttestationDiagnostics;
  getRow(rowIndex: number): AttestationDiagnostics;
  getField(rowIndex: number, field: string): AttestationDiagnostics;
  getFieldError(rowIndex: number, field: string): AttestationDiagnostic | undefined;
  applySuggestion(rowIndex: number, field: string, suggestion: string): void;
  applyFromDiagnostic(diagnostic: AttestationDiagnostic, fallback?: string): void;
}

/** CSV namespace on `BulkCsvAttestUIController`. */
export interface BulkCsvController {
  parse(csvText: string, overrides?: Omit<ParseCsvOptions, 'mode'>): Promise<CsvParseResult>;
  result: CsvParseResult | null;
  isLoading: boolean;
  error: Error | null;
}

/** Validation namespace on `BulkCsvAttestUIController`. */
export interface BulkValidationController {
  run(overrides?: Omit<ValidationOptions, 'mode'>): Promise<BulkValidationResult>;
  result: BulkValidationResult | null;
  isRunning: boolean;
  error: Error | null;
}

/** Submission namespace on `BulkCsvAttestUIController`. */
export interface BulkSubmissionController {
  submit(params?: {
    walletAdapter?: OnchainWalletAdapter;
    rows?: AttestationRowInput[] | PreparedAttestation[];
    validateBeforeSubmit?: boolean;
    validationOptions?: Omit<ValidationOptions, 'mode'>;
  }): Promise<BulkOnchainSubmitResult>;
  result: BulkOnchainSubmitResult | null;
  isSubmitting: boolean;
  error: Error | null;
}

/**
 * Controller returned by `useBulkCsvAttestUI`.
 * @example
 * ```tsx
 * const { mode, queue, diagnostics, csv, validation, submission, reset } =
 *   useBulkCsvAttestUI(attest);
 * ```
 */
export interface BulkCsvAttestUIController {
  mode: AttestationModeProfileName;
  setMode(mode: AttestationModeProfileName): void;
  queue: BulkQueueController;
  diagnostics: BulkDiagnosticsController;
  csv: BulkCsvController;
  validation: BulkValidationController;
  submission: BulkSubmissionController;
  reset(rows?: AttestationRowInput[]): void;
}

export interface SingleAttestModuleProps extends SingleAttestUIOptions {
  attest: AttestClient;
  children: (controller: SingleAttestUIController) => unknown;
}

export interface BulkCsvAttestModuleProps extends BulkCsvAttestUIOptions {
  attest: AttestClient;
  children: (controller: BulkCsvAttestUIController) => unknown;
}

export interface SingleAttestFormClassNames {
  root?: string;
  modeRow?: string;
  modeSelect?: string;
  fieldRow?: string;
  label?: string;
  input?: string;
  fieldError?: string;
  suggestionRow?: string;
  suggestionButton?: string;
  actionsRow?: string;
  validateButton?: string;
  submitButton?: string;
  status?: string;
}

export interface SingleAttestFormLabels {
  mode?: string;
  simpleMode?: string;
  advancedMode?: string;
  validate?: string;
  submit?: string;
  validationLoading?: string;
  submitLoading?: string;
}

export interface SingleAttestFieldRenderContext {
  field: FormFieldDefinition;
  row: AttestationRowInput;
  value: string;
  error?: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onApplySuggestion: (suggestion: string) => void;
}

export interface SingleAttestFormProps {
  controller: SingleAttestUIController;
  classNames?: SingleAttestFormClassNames;
  labels?: SingleAttestFormLabels;
  walletAdapter?: OnchainWalletAdapter;
  renderField?: (context: SingleAttestFieldRenderContext) => unknown;
}

export interface BulkCsvTableClassNames {
  root?: string;
  importRow?: string;
  csvInput?: string;
  parseButton?: string;
  tableWrapper?: string;
  table?: string;
  headerCell?: string;
  rowCell?: string;
  input?: string;
  cellError?: string;
  cellSuggestions?: string;
  suggestionButton?: string;
  actionsRow?: string;
  addRowButton?: string;
  validateButton?: string;
  submitButton?: string;
  status?: string;
}

export interface BulkCsvTableLabels {
  csvPlaceholder?: string;
  parseCsv?: string;
  addRow?: string;
  removeRow?: string;
  validate?: string;
  submit?: string;
  validationLoading?: string;
  submitLoading?: string;
}

export interface BulkCsvCellRenderContext {
  rowIndex: number;
  field: string;
  value: string;
  error?: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onApplySuggestion: (suggestion: string) => void;
}

export interface BulkCsvTableProps {
  controller: BulkCsvAttestUIController;
  classNames?: BulkCsvTableClassNames;
  labels?: BulkCsvTableLabels;
  walletAdapter?: OnchainWalletAdapter;
  renderCell?: (context: BulkCsvCellRenderContext) => unknown;
}
```

---

## Change 9 — `src/attest/react/uiHooks.ts` (two targeted edits)

Do **not** rewrite the whole file. Make only the following two targeted replacements.

### 9a. Replace the `useSingleAttestUI` return value

Find:
```ts
  return useMemo(
    () => ({
      mode,
      row,
      fields,
      diagnostics,
      validation: single.validation,
      submission: single.submission,
      setMode,
      setRow,
      setField,
      applySuggestion,
      applyDiagnosticSuggestion,
      validate,
      prepare,
      submit,
      reset
    }),
    [
      mode,
      row,
      fields,
      diagnostics,
      single.validation,
      single.submission,
      setField,
      applySuggestion,
      applyDiagnosticSuggestion,
      validate,
      prepare,
      submit,
      reset
    ]
  );
}
```

Replace with:
```ts
  return useMemo(
    () => ({
      mode,
      setMode,
      row,
      fields,
      setRow,
      setField,
      diagnostics: {
        all: diagnostics,
        applySuggestion,
        applyFromDiagnostic: applyDiagnosticSuggestion
      },
      validation: {
        run: validate,
        result: single.validation.result,
        isRunning: single.validation.loading,
        error: single.validation.error
      },
      submission: {
        prepare,
        submit,
        result: single.submission.result,
        isSubmitting: single.submission.loading,
        error: single.submission.error
      },
      reset
    }),
    [
      mode,
      row,
      fields,
      diagnostics,
      single.validation.result,
      single.validation.loading,
      single.validation.error,
      single.submission.result,
      single.submission.loading,
      single.submission.error,
      setField,
      applySuggestion,
      applyDiagnosticSuggestion,
      validate,
      prepare,
      submit,
      reset
    ]
  );
}
```

### 9b. Replace the `useBulkCsvAttestUI` return value

Find:
```ts
  return useMemo(
    () => ({
      mode,
      rows,
      columns,
      diagnostics,
      csv: bulk.csv,
      validation: bulk.validation,
      submission: bulk.submission,
      setMode,
      setRows,
      setColumns,
      setCell,
      addRow,
      removeRow,
      parseCsvText,
      validate,
      getRowDiagnostics,
      getFieldDiagnostics,
      getFieldError,
      applySuggestion,
      applyDiagnosticSuggestion,
      submit,
      reset
    }),
    [
      mode,
      rows,
      columns,
      diagnostics,
      bulk.csv,
      bulk.validation,
      bulk.submission,
      setCell,
      addRow,
      removeRow,
      parseCsvText,
      validate,
      getRowDiagnostics,
      getFieldDiagnostics,
      getFieldError,
      applySuggestion,
      applyDiagnosticSuggestion,
      submit,
      reset
    ]
  );
}
```

Replace with:
```ts
  return useMemo(
    () => ({
      mode,
      setMode,
      queue: {
        rows,
        columns,
        setRows,
        setColumns,
        setCell,
        addRow,
        removeRow
      },
      diagnostics: {
        all: diagnostics,
        getRow: getRowDiagnostics,
        getField: getFieldDiagnostics,
        getFieldError,
        applySuggestion,
        applyFromDiagnostic: applyDiagnosticSuggestion
      },
      csv: {
        parse: parseCsvText,
        result: bulk.csv.result,
        isLoading: bulk.csv.loading,
        error: bulk.csv.error
      },
      validation: {
        run: validate,
        result: bulk.validation.result,
        isRunning: bulk.validation.loading,
        error: bulk.validation.error
      },
      submission: {
        submit,
        result: bulk.submission.result,
        isSubmitting: bulk.submission.loading,
        error: bulk.submission.error
      },
      reset
    }),
    [
      mode,
      rows,
      columns,
      diagnostics,
      bulk.csv.result,
      bulk.csv.loading,
      bulk.csv.error,
      bulk.validation.result,
      bulk.validation.loading,
      bulk.validation.error,
      bulk.submission.result,
      bulk.submission.loading,
      bulk.submission.error,
      setRows,
      setColumns,
      setCell,
      addRow,
      removeRow,
      parseCsvText,
      validate,
      getRowDiagnostics,
      getFieldDiagnostics,
      getFieldError,
      applySuggestion,
      applyDiagnosticSuggestion,
      submit,
      reset
    ]
  );
}
```

---

## Change 10 — `src/attest/react/components.ts` (six targeted replacements)

Apply each replacement exactly. Do not touch any other lines.

### 10a. `diagnostics` → `diagnostics.all` (line ~165)
```ts
// Find
    const error = getFieldError(props.controller.diagnostics, 0, field.id);
    const suggestions = collectSuggestions(props.controller.diagnostics, 0, field.id);
// Replace with
    const error = getFieldError(props.controller.diagnostics.all, 0, field.id);
    const suggestions = collectSuggestions(props.controller.diagnostics.all, 0, field.id);
```

### 10b. `applySuggestion` in suggestion button click (line ~190)
```ts
// Find
          onClick: () => props.controller.applySuggestion(field.id, suggestion)
// Replace with
          onClick: () => props.controller.diagnostics.applySuggestion(field.id, suggestion)
```

### 10c. `onApplySuggestion` in field context (line ~175)
```ts
// Find
      onApplySuggestion: (suggestion: string) => props.controller.applySuggestion(field.id, suggestion)
// Replace with
      onApplySuggestion: (suggestion: string) => props.controller.diagnostics.applySuggestion(field.id, suggestion)
```

### 10d. Validate button (SingleAttestForm)
```ts
// Find
          disabled: props.controller.validation.loading,
          onClick: () => {
            void props.controller.validate();
          }
        },
        props.controller.validation.loading ? labels.validationLoading : labels.validate
// Replace with
          disabled: props.controller.validation.isRunning,
          onClick: () => {
            void props.controller.validation.run();
          }
        },
        props.controller.validation.isRunning ? labels.validationLoading : labels.validate
```

### 10e. Submit button (SingleAttestForm)
```ts
// Find
          disabled: props.controller.submission.loading,
          onClick: () => {
            void props.controller.submit(props.walletAdapter);
          }
        },
        props.controller.submission.loading ? labels.submitLoading : labels.submit
// Replace with
          disabled: props.controller.submission.isSubmitting,
          onClick: () => {
            void props.controller.submission.submit(props.walletAdapter);
          }
        },
        props.controller.submission.isSubmitting ? labels.submitLoading : labels.submit
```

### 10f. Entire `BulkCsvTable` function body — update all references

In the `BulkCsvTable` function, apply these replacements (search-and-replace, all occurrences):

| Find | Replace with |
|---|---|
| `props.controller.rows` | `props.controller.queue.rows` |
| `props.controller.columns` | `props.controller.queue.columns` |
| `props.controller.setCell` | `props.controller.queue.setCell` |
| `props.controller.addRow` | `props.controller.queue.addRow` |
| `props.controller.removeRow` | `props.controller.queue.removeRow` |
| `props.controller.getFieldDiagnostics` | `props.controller.diagnostics.getField` |
| `props.controller.getFieldError` | `props.controller.diagnostics.getFieldError` |
| `props.controller.applySuggestion` | `props.controller.diagnostics.applySuggestion` |
| `props.controller.parseCsvText` | `props.controller.csv.parse` |
| `props.controller.csv.loading` | `props.controller.csv.isLoading` |
| `props.controller.validation.loading` | `props.controller.validation.isRunning` |
| `props.controller.submission.loading` | `props.controller.submission.isSubmitting` |
| `props.controller.validate()` | `props.controller.validation.run()` |
| `props.controller.submit({ walletAdapter: props.walletAdapter })` | `props.controller.submission.submit({ walletAdapter: props.walletAdapter })` |

---

## Change 11 — New file `tests/consumer/tsconfig.json`

Create the directory `tests/consumer/` if it does not exist, then create this file:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "react",
    "paths": {
      "@openlabels/oli-sdk": ["../../dist/index.d.ts"],
      "@openlabels/oli-sdk/attest": ["../../dist/attest.entry.d.ts"],
      "@openlabels/oli-sdk/attest-ui": ["../../dist/attest-ui.entry.d.ts"],
      "@openlabels/oli-sdk/projects": ["../../dist/projects.entry.d.ts"],
      "@openlabels/oli-sdk/contributions": ["../../dist/contributions.entry.d.ts"],
      "@openlabels/oli-sdk/validation": ["../../dist/validation.entry.d.ts"],
      "@openlabels/oli-sdk/chains": ["../../dist/chains.entry.d.ts"]
    }
  },
  "include": ["type-check.ts"]
}
```

---

## Change 12 — New file `tests/consumer/type-check.ts`

Create this file. It must import **only** from `@openlabels/oli-sdk` subpaths — no `src/` or relative imports allowed.

```ts
/**
 * Consumer type integration test.
 * Compiled via: npm run test:types
 */

// Root
import type {
  AttestationRowInput,
  AttestationDiagnostic,
  AttestationDiagnostics,
  OnchainSubmitResult,
  BulkOnchainSubmitResult,
  PreparedAttestation,
  SingleValidationResult,
  BulkValidationResult,
  DiagnosticCode
} from '@openlabels/oli-sdk';
import { OLIClient, DIAGNOSTIC_CODES } from '@openlabels/oli-sdk';

// /attest
import type {
  AttestationModeProfileName,
  ValidationOptions as AttestValidationOptions
} from '@openlabels/oli-sdk/attest';
import { AttestClient, createDynamicWalletAdapter, simpleProfile, advancedProfile } from '@openlabels/oli-sdk/attest';

// /attest-ui
import type {
  SingleAttestUIController,
  BulkCsvAttestUIController
} from '@openlabels/oli-sdk/attest-ui';
import { useSingleAttestUI, useBulkCsvAttestUI } from '@openlabels/oli-sdk/attest-ui';

// /projects
import { fetchProjects, findSimilarProjects } from '@openlabels/oli-sdk/projects';

// /contributions
import type { SubmitProjectContributionInput } from '@openlabels/oli-sdk/contributions';
import { submitProjectContribution } from '@openlabels/oli-sdk/contributions';

// /validation
import type { DiagnosticCode as ValidationDiagnosticCode } from '@openlabels/oli-sdk/validation';
import {
  DIAGNOSTIC_CODES as VALIDATION_DIAGNOSTIC_CODES,
  isValidEvmAddress,
  validateAddressForChain,
  validateContractName,
  validateTxHash,
  validateURL,
  validateBoolean
} from '@openlabels/oli-sdk/validation';

// /chains
import type { ChainMetadata, Caip10Parts } from '@openlabels/oli-sdk/chains';
import {
  CHAINS,
  CHAIN_OPTIONS,
  CHAIN_ALIASES,
  convertChainId,
  parseCaip10,
  buildCaip10,
  normalizeChainId,
  isValidEvmAddress as isValidEvmAddressFromChains,
  toChecksumAddress,
  CATEGORIES,
  VALID_CATEGORY_IDS,
  convertCategoryAlias
} from '@openlabels/oli-sdk/chains';

// ── Type composition checks ──────────────────────────────────────────────────

const _rootCode: DiagnosticCode = DIAGNOSTIC_CODES.CHAIN_INVALID;
const _validationCode: ValidationDiagnosticCode = VALIDATION_DIAGNOSTIC_CODES.ADDRESS_INVALID;

function _testSingleController(c: SingleAttestUIController): void {
  const _mode: AttestationModeProfileName = c.mode;
  const _row: AttestationRowInput = c.row;
  const _allDiags: AttestationDiagnostics = c.diagnostics.all;
  const _isRunning: boolean = c.validation.isRunning;
  const _validationResult: SingleValidationResult | null = c.validation.result;
  const _isSubmitting: boolean = c.submission.isSubmitting;
  const _submitResult: OnchainSubmitResult | null = c.submission.result;
  const _prepared: Promise<PreparedAttestation> = c.submission.prepare();
  void _mode; void _row; void _allDiags; void _isRunning; void _validationResult;
  void _isSubmitting; void _submitResult; void _prepared;
}

function _testBulkController(c: BulkCsvAttestUIController): void {
  const _rows: AttestationRowInput[] = c.queue.rows;
  const _cols: string[] = c.queue.columns;
  const _allDiags: AttestationDiagnostics = c.diagnostics.all;
  const _rowDiags: AttestationDiagnostics = c.diagnostics.getRow(0);
  const _fieldError: AttestationDiagnostic | undefined = c.diagnostics.getFieldError(0, 'address');
  const _csvLoading: boolean = c.csv.isLoading;
  const _validationRunning: boolean = c.validation.isRunning;
  const _bulkResult: BulkValidationResult | null = c.validation.result;
  const _submitRunning: boolean = c.submission.isSubmitting;
  const _bulkSubmitResult: BulkOnchainSubmitResult | null = c.submission.result;
  void _rows; void _cols; void _allDiags; void _rowDiags; void _fieldError;
  void _csvLoading; void _validationRunning; void _bulkResult; void _submitRunning; void _bulkSubmitResult;
}

const _firstChain: ChainMetadata = CHAINS[0];
const _caip10Parts: Caip10Parts | null = parseCaip10('eip155:8453:0x0000000000000000000000000000000000000000');
const _builtCaip10: string = buildCaip10('eip155:8453', '0x0000000000000000000000000000000000000000');
const _normalized: string | null = normalizeChainId('eip155:8453');
const _converted: string = convertChainId('base');
const _checksummed: string = toChecksumAddress('0x0000000000000000000000000000000000000000');
const _categoryAlias: string = convertCategoryAlias('dex');
const _validCategoryId: boolean = (VALID_CATEGORY_IDS as string[]).includes('dex');

void _firstChain; void _caip10Parts; void _builtCaip10; void _normalized;
void _converted; void _checksummed; void _categoryAlias; void _validCategoryId;
void _rootCode; void _validationCode;

void OLIClient; void AttestClient; void createDynamicWalletAdapter;
void simpleProfile; void advancedProfile;
void useSingleAttestUI; void useBulkCsvAttestUI;
void fetchProjects; void findSimilarProjects;
void submitProjectContribution;
void isValidEvmAddress; void validateAddressForChain; void validateContractName;
void validateTxHash; void validateURL; void validateBoolean;
void CHAINS; void CHAIN_OPTIONS; void CHAIN_ALIASES;
void isValidEvmAddressFromChains; void CATEGORIES;
```

---

## Change 13 — Migration doc: `docs/MIGRATION_HOOK_API.md`

Create this file. It is the machine-readable reference for migrating from the old flat hook API to the new grouped shape.

```markdown
# Hook API Migration: Flat → Grouped

**Applies to:** `@openlabels/oli-sdk` — upgrade to the new grouped return shape
**Entry point changed:** `@openlabels/oli-sdk/attest-ui`
**Interfaces changed:** `SingleAttestUIController`, `BulkCsvAttestUIController`

## Machine-Readable Rename Map

Keys are old paths (relative to the controller object), values are new paths.

\`\`\`json
{
  "diagnostics": "diagnostics.all",
  "applySuggestion": "diagnostics.applySuggestion",
  "applyDiagnosticSuggestion": "diagnostics.applyFromDiagnostic",
  "validate": "validation.run",
  "validation.loading": "validation.isRunning",
  "prepare": "submission.prepare",
  "submit": "submission.submit",
  "submission.loading": "submission.isSubmitting",
  "rows": "queue.rows",
  "columns": "queue.columns",
  "setRows": "queue.setRows",
  "setColumns": "queue.setColumns",
  "setCell": "queue.setCell",
  "addRow": "queue.addRow",
  "removeRow": "queue.removeRow",
  "parseCsvText": "csv.parse",
  "csv.loading": "csv.isLoading",
  "getRowDiagnostics": "diagnostics.getRow",
  "getFieldDiagnostics": "diagnostics.getField",
  "getFieldError": "diagnostics.getFieldError"
}
\`\`\`

## `useSingleAttestUI` Full Mapping Table

| Old (flat) | New | Notes |
|---|---|---|
| `mode` | `mode` | unchanged |
| `setMode(mode)` | `setMode(mode)` | unchanged |
| `row` | `row` | unchanged |
| `fields` | `fields` | unchanged |
| `setRow(row)` | `setRow(row)` | unchanged |
| `setField(field, value)` | `setField(field, value)` | unchanged |
| `diagnostics` | `diagnostics.all` | moved into namespace |
| `applySuggestion(field, suggestion)` | `diagnostics.applySuggestion(field, suggestion)` | moved |
| `applyDiagnosticSuggestion(diag, fallback?)` | `diagnostics.applyFromDiagnostic(diag, fallback?)` | moved + renamed |
| `validation.loading` | `validation.isRunning` | renamed |
| `validation.error` | `validation.error` | unchanged |
| `validation.result` | `validation.result` | unchanged |
| `validate(overrides?)` | `validation.run(overrides?)` | moved + renamed |
| `prepare(overrides?)` | `submission.prepare(overrides?)` | moved |
| `submit(walletAdapter?, overrides?)` | `submission.submit(walletAdapter?, overrides?)` | moved |
| `submission.loading` | `submission.isSubmitting` | renamed |
| `submission.error` | `submission.error` | unchanged |
| `submission.result` | `submission.result` | unchanged |
| `reset(row?)` | `reset(row?)` | unchanged |

## `useBulkCsvAttestUI` Full Mapping Table

| Old (flat) | New | Notes |
|---|---|---|
| `mode` | `mode` | unchanged |
| `setMode(mode)` | `setMode(mode)` | unchanged |
| `rows` | `queue.rows` | moved into `queue` |
| `columns` | `queue.columns` | moved |
| `setRows(rows)` | `queue.setRows(rows)` | moved |
| `setColumns(cols)` | `queue.setColumns(cols)` | moved |
| `setCell(rowIndex, field, value)` | `queue.setCell(rowIndex, field, value)` | moved |
| `addRow(row?)` | `queue.addRow(row?)` | moved |
| `removeRow(rowIndex)` | `queue.removeRow(rowIndex)` | moved |
| `diagnostics` | `diagnostics.all` | moved into namespace |
| `getRowDiagnostics(rowIndex)` | `diagnostics.getRow(rowIndex)` | moved + renamed |
| `getFieldDiagnostics(rowIndex, field)` | `diagnostics.getField(rowIndex, field)` | moved + renamed |
| `getFieldError(rowIndex, field)` | `diagnostics.getFieldError(rowIndex, field)` | moved |
| `applySuggestion(rowIndex, field, suggestion)` | `diagnostics.applySuggestion(rowIndex, field, suggestion)` | moved |
| `applyDiagnosticSuggestion(diag, fallback?)` | `diagnostics.applyFromDiagnostic(diag, fallback?)` | moved + renamed |
| `parseCsvText(csvText, overrides?)` | `csv.parse(csvText, overrides?)` | moved + renamed |
| `csv.loading` | `csv.isLoading` | renamed |
| `csv.error` | `csv.error` | unchanged |
| `csv.result` | `csv.result` | unchanged |
| `validate(overrides?)` | `validation.run(overrides?)` | moved + renamed |
| `validation.loading` | `validation.isRunning` | renamed |
| `validation.error` | `validation.error` | unchanged |
| `validation.result` | `validation.result` | unchanged |
| `submit(params?)` | `submission.submit(params?)` | moved |
| `submission.loading` | `submission.isSubmitting` | renamed |
| `submission.error` | `submission.error` | unchanged |
| `submission.result` | `submission.result` | unchanged |
| `reset(rows?)` | `reset(rows?)` | unchanged |

## Before / After Examples

### Validate + apply suggestion
\`\`\`tsx
// Before
await controller.validate();
controller.applySuggestion(diag.field!, diag.suggestion!);

// After
await controller.validation.run();
controller.diagnostics.applySuggestion(diag.field!, diag.suggestion!);
\`\`\`

### Submit single attestation
\`\`\`tsx
// Before
await controller.submit(walletAdapter);

// After
await controller.submission.submit(walletAdapter);
\`\`\`

### Parse CSV (bulk)
\`\`\`tsx
// Before
await controller.parseCsvText(csvText);

// After
await controller.csv.parse(csvText);
\`\`\`

### Access rows / cells (bulk)
\`\`\`tsx
// Before
const rows = controller.rows;
controller.setCell(0, 'address', '0x...');
controller.addRow({});

// After
const rows = controller.queue.rows;
controller.queue.setCell(0, 'address', '0x...');
controller.queue.addRow({});
\`\`\`

### Loading/running states in JSX
\`\`\`tsx
// Before
<button disabled={controller.validation.loading}>
  {controller.validation.loading ? 'Validating…' : 'Validate'}
</button>

// After
<button disabled={controller.validation.isRunning}>
  {controller.validation.isRunning ? 'Validating…' : 'Validate'}
</button>
\`\`\`
```

---

## Verification

After applying all changes, run these commands in order. All must succeed.

```bash
# 1. Build
npm run build
# Expected: ESM ⚡️ Build success, CJS ⚡️ Build success, DTS ⚡️ Build success
# All named entry .d.ts files must appear in DTS output

# 2. Consumer type check (must show 0 errors — no output means pass)
npm run test:types

# 3. Existing test suite (1 pre-existing failure in attest.dynamic-e2e is acceptable)
npm test
# Expected: pass ≥ 31, fail ≤ 1 (the dynamic e2e bulk sponsored flow)

# 4. Confirm new subpath bundles exist
ls dist/validation.entry.{js,mjs,d.ts}
ls dist/chains.entry.{js,mjs,d.ts}

# 5. Confirm DIAGNOSTIC_CODES is exported from root
node -e "const { DIAGNOSTIC_CODES } = require('./dist/index.js'); console.log(Object.keys(DIAGNOSTIC_CODES).length, 'codes')"
# Expected: 31 codes
```

---

## What NOT to change

- Do not modify any `*.test.ts` file other than creating `tests/consumer/type-check.ts`.
- Do not modify `src/attest/react/hooks.ts` (the low-level `useSingleAttest` / `useBulkCsvAttest` hooks). Only `uiHooks.ts` changes.
- Do not rename or move any existing source file.
- Do not add `react` to `dependencies` — it stays as an optional peer dependency.
- Do not bump the `version` field in `package.json`.
