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

/**
 * Options accepted by `useSingleAttestUI`.
 */
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

/**
 * Options accepted by `useBulkCsvAttestUI`.
 */
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

/**
 * Diagnostics namespace on `SingleAttestUIController`.
 */
export interface SingleDiagnosticsController {
  /** All diagnostics produced by the last `validation.run()`. */
  all: AttestationDiagnostics;
  /**
   * Apply a suggestion string to a field, updating the row.
   * @param field - Field ID to apply the suggestion to.
   * @param suggestion - Suggestion value to set.
   */
  applySuggestion(field: string, suggestion: string): void;
  /**
   * Apply the first available suggestion from a diagnostic object.
   * @param diagnostic - Diagnostic whose `.suggestion` or `.suggestions[0]` will be applied.
   * @param fallback - Fallback value used when the diagnostic carries no suggestion.
   */
  applyFromDiagnostic(diagnostic: AttestationDiagnostic, fallback?: string): void;
}

/**
 * Validation namespace on `SingleAttestUIController`.
 */
export interface SingleValidationController {
  /**
   * Run validation against the current row.
   * @param overrides - Options merged over the hook-level `validationOptions`.
   */
  run(overrides?: Omit<ValidationOptions, 'mode'>): Promise<SingleValidationResult>;
  /** Result of the last `run()` call, or `null` before the first run. */
  result: SingleValidationResult | null;
  /** `true` while a `run()` call is in flight. */
  isRunning: boolean;
  /** Error thrown by the last `run()` call, or `null`. */
  error: Error | null;
}

/**
 * Submission namespace on `SingleAttestUIController`.
 */
export interface SingleSubmissionController {
  /**
   * Prepare (validate + encode) the current row for onchain submission.
   * @param overrides - Options merged over the hook-level `prepareOptions`.
   */
  prepare(overrides?: Omit<PrepareSingleOptions, 'mode'>): Promise<PreparedAttestation>;
  /**
   * Prepare and submit the current row onchain.
   * @param walletAdapter - Wallet adapter for this call; falls back to the hook-level adapter.
   * @param overrides - Options merged over the hook-level `prepareOptions`.
   */
  submit(walletAdapter?: OnchainWalletAdapter, overrides?: Omit<PrepareSingleOptions, 'mode'>): Promise<OnchainSubmitResult>;
  /** Result of the last `submit()` call, or `null` before the first submit. */
  result: OnchainSubmitResult | null;
  /** `true` while a `submit()` call is in flight. */
  isSubmitting: boolean;
  /** Error thrown by the last `submit()` call, or `null`. */
  error: Error | null;
}

/**
 * Controller returned by `useSingleAttestUI`.
 *
 * @example
 * ```tsx
 * const { mode, setMode, row, setField, diagnostics, validation, submission, reset } =
 *   useSingleAttestUI(attest, { mode: 'simpleProfile' });
 * ```
 */
export interface SingleAttestUIController {
  /** Active attestation mode profile. */
  mode: AttestationModeProfileName;
  /** Switch to a different attestation mode profile. */
  setMode(mode: AttestationModeProfileName): void;
  /** Current row data (all field values). */
  row: AttestationRowInput;
  /** Form field definitions filtered for the current mode and field options. */
  fields: FormFieldDefinition[];
  /** Replace the entire row object. */
  setRow(row: AttestationRowInput): void;
  /** Update a single field value on the current row. */
  setField(field: string, value: AttestationFieldValue): void;
  /** Diagnostics helpers. */
  diagnostics: SingleDiagnosticsController;
  /** Validation state and runner. */
  validation: SingleValidationController;
  /** Submission state, prepare, and submit. */
  submission: SingleSubmissionController;
  /**
   * Reset the row to `nextRow` (or the original `initialRow`).
   * @param row - Optional row to reset to.
   */
  reset(row?: AttestationRowInput): void;
}

/**
 * Queue namespace on `BulkCsvAttestUIController`.
 */
export interface BulkQueueController {
  /** Current row data. Always contains at least one (possibly empty) row. */
  rows: AttestationRowInput[];
  /** Ordered list of column field IDs shown in the table. */
  columns: string[];
  /** Replace the entire row array. */
  setRows(rows: AttestationRowInput[]): void;
  /** Replace the column order. */
  setColumns(cols: string[]): void;
  /** Update a single cell value. */
  setCell(rowIndex: number, field: string, value: AttestationFieldValue): void;
  /** Append a new row, optionally pre-populated. */
  addRow(row?: AttestationRowInput): void;
  /** Remove the row at `rowIndex`. */
  removeRow(rowIndex: number): void;
}

/**
 * Diagnostics namespace on `BulkCsvAttestUIController`.
 */
export interface BulkDiagnosticsController {
  /** All diagnostics produced by the last `validation.run()` or `csv.parse()`. */
  all: AttestationDiagnostics;
  /**
   * Diagnostics scoped to a single row.
   * @param rowIndex - Zero-based row index.
   */
  getRow(rowIndex: number): AttestationDiagnostics;
  /**
   * Diagnostics scoped to a single cell.
   * @param rowIndex - Zero-based row index.
   * @param field - Field ID.
   */
  getField(rowIndex: number, field: string): AttestationDiagnostics;
  /**
   * The first error diagnostic for a cell, or `undefined` if none.
   * @param rowIndex - Zero-based row index.
   * @param field - Field ID.
   */
  getFieldError(rowIndex: number, field: string): AttestationDiagnostic | undefined;
  /**
   * Apply a suggestion to a cell, updating that row.
   * @param rowIndex - Zero-based row index.
   * @param field - Field ID.
   * @param suggestion - Suggestion value to set.
   */
  applySuggestion(rowIndex: number, field: string, suggestion: string): void;
  /**
   * Apply the first available suggestion from a diagnostic object.
   * @param diagnostic - Diagnostic whose `.suggestion` or `.suggestions[0]` will be applied.
   * @param fallback - Fallback value used when the diagnostic carries no suggestion.
   */
  applyFromDiagnostic(diagnostic: AttestationDiagnostic, fallback?: string): void;
}

/**
 * CSV namespace on `BulkCsvAttestUIController`.
 */
export interface BulkCsvController {
  /**
   * Parse a CSV string, replacing the current rows and columns.
   * @param csvText - Raw CSV text.
   * @param overrides - Options merged over the hook-level `parseOptions`.
   */
  parse(csvText: string, overrides?: Omit<ParseCsvOptions, 'mode'>): Promise<CsvParseResult>;
  /** Result of the last `parse()` call, or `null` before the first parse. */
  result: CsvParseResult | null;
  /** `true` while a `parse()` call is in flight. */
  isLoading: boolean;
  /** Error thrown by the last `parse()` call, or `null`. */
  error: Error | null;
}

/**
 * Validation namespace on `BulkCsvAttestUIController`.
 */
export interface BulkValidationController {
  /**
   * Run bulk validation against the current rows.
   * @param overrides - Options merged over the hook-level `validationOptions`.
   */
  run(overrides?: Omit<ValidationOptions, 'mode'>): Promise<BulkValidationResult>;
  /** Result of the last `run()` call, or `null` before the first run. */
  result: BulkValidationResult | null;
  /** `true` while a `run()` call is in flight. */
  isRunning: boolean;
  /** Error thrown by the last `run()` call, or `null`. */
  error: Error | null;
}

/**
 * Submission namespace on `BulkCsvAttestUIController`.
 */
export interface BulkSubmissionController {
  /**
   * Validate and submit all rows onchain.
   * @param params.walletAdapter - Wallet adapter for this call; falls back to the hook-level adapter.
   * @param params.rows - Explicit rows or prepared attestations; defaults to the queue.
   * @param params.validateBeforeSubmit - When `false` skips the pre-submit validation step.
   * @param params.validationOptions - Options forwarded to the pre-submit validation.
   */
  submit(params?: {
    walletAdapter?: OnchainWalletAdapter;
    rows?: AttestationRowInput[] | PreparedAttestation[];
    validateBeforeSubmit?: boolean;
    validationOptions?: Omit<ValidationOptions, 'mode'>;
  }): Promise<BulkOnchainSubmitResult>;
  /** Result of the last `submit()` call, or `null` before the first submit. */
  result: BulkOnchainSubmitResult | null;
  /** `true` while a `submit()` call is in flight. */
  isSubmitting: boolean;
  /** Error thrown by the last `submit()` call, or `null`. */
  error: Error | null;
}

/**
 * Controller returned by `useBulkCsvAttestUI`.
 *
 * @example
 * ```tsx
 * const { mode, queue, diagnostics, csv, validation, submission, reset } =
 *   useBulkCsvAttestUI(attest);
 * ```
 */
export interface BulkCsvAttestUIController {
  /** Active attestation mode profile. */
  mode: AttestationModeProfileName;
  /** Switch to a different attestation mode profile. */
  setMode(mode: AttestationModeProfileName): void;
  /** Row and column queue management. */
  queue: BulkQueueController;
  /** Diagnostics helpers. */
  diagnostics: BulkDiagnosticsController;
  /** CSV parse state and runner. */
  csv: BulkCsvController;
  /** Validation state and runner. */
  validation: BulkValidationController;
  /** Submission state and runner. */
  submission: BulkSubmissionController;
  /**
   * Reset rows to `nextRows` (or the original `initialRows`).
   * @param rows - Optional rows to reset to.
   */
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
