/**
 * Consumer type integration test.
 *
 * This file imports exclusively from the public package subpaths (no src/ imports).
 * It is compiled with `tsc --noEmit` via `npm run test:types` to ensure the built
 * dist declarations are complete, correct, and free of hash-named chunk conflicts.
 */

// ── Root subpath ──────────────────────────────────────────────────────────────
import type {
  OLIConfig,
  AttestationRowInput,
  AttestationDiagnostic,
  AttestationDiagnostics,
  OnchainWalletAdapter,
  OnchainSubmitResult,
  BulkOnchainSubmitResult,
  PreparedAttestation,
  SingleValidationResult,
  BulkValidationResult,
  DiagnosticCode
} from '@openlabels/oli-sdk';
import { OLIClient, DIAGNOSTIC_CODES } from '@openlabels/oli-sdk';

// ── /attest ───────────────────────────────────────────────────────────────────
import type {
  AttestationModeProfileName,
  ValidationOptions as AttestValidationOptions,
  PrepareSingleOptions
} from '@openlabels/oli-sdk/attest';
import { AttestClient, createDynamicWalletAdapter, simpleProfile, advancedProfile } from '@openlabels/oli-sdk/attest';

// ── /attest-ui ────────────────────────────────────────────────────────────────
import type {
  SingleAttestUIController,
  BulkCsvAttestUIController,
  SingleAttestUIOptions,
  BulkCsvAttestUIOptions
} from '@openlabels/oli-sdk/attest-ui';
import { useSingleAttestUI, useBulkCsvAttestUI } from '@openlabels/oli-sdk/attest-ui';

// ── /projects ─────────────────────────────────────────────────────────────────
import type {
  ProjectSimilarityMatch,
  ProjectValidationResult
} from '@openlabels/oli-sdk/projects';
import { fetchProjects, findSimilarProjects } from '@openlabels/oli-sdk/projects';

// ── /contributions ────────────────────────────────────────────────────────────
import type { SubmitProjectContributionInput } from '@openlabels/oli-sdk/contributions';
import { submitProjectContribution } from '@openlabels/oli-sdk/contributions';

// ── /validation ───────────────────────────────────────────────────────────────
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

// ── /chains ───────────────────────────────────────────────────────────────────
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

// ── Type composition checks ───────────────────────────────────────────────────
// Verify that DIAGNOSTIC_CODES re-exported from root and /validation are the same shape.
const _rootCode: DiagnosticCode = DIAGNOSTIC_CODES.CHAIN_INVALID;
const _validationCode: ValidationDiagnosticCode = VALIDATION_DIAGNOSTIC_CODES.ADDRESS_INVALID;

// Verify SingleAttestUIController nested shape is accessible.
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

// Verify BulkCsvAttestUIController nested shape is accessible.
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

// Verify chains data types.
const _firstChain: ChainMetadata = CHAINS[0];
const _caip10Parts: Caip10Parts | null = parseCaip10('eip155:8453:0x0000000000000000000000000000000000000000');
const _builtCaip10: string = buildCaip10('eip155:8453', '0x0000000000000000000000000000000000000000');
const _normalised: string | null = normalizeChainId('eip155:8453');
const _converted: string = convertChainId('base');
const _checksummed: string = toChecksumAddress('0x0000000000000000000000000000000000000000');
const _categoryAlias: string = convertCategoryAlias('dex');
const _validCategoryId: boolean = (VALID_CATEGORY_IDS as string[]).includes('dex');

void _firstChain; void _caip10Parts; void _builtCaip10; void _normalised;
void _converted; void _checksummed; void _categoryAlias; void _validCategoryId;
void _rootCode; void _validationCode;

// Prevent "unused import" errors for side-effect-only imports.
void OLIClient; void AttestClient; void createDynamicWalletAdapter;
void simpleProfile; void advancedProfile;
void useSingleAttestUI; void useBulkCsvAttestUI;
void fetchProjects; void findSimilarProjects;
void submitProjectContribution;
void isValidEvmAddress; void validateAddressForChain; void validateContractName;
void validateTxHash; void validateURL; void validateBoolean;
void CHAINS; void CHAIN_OPTIONS; void CHAIN_ALIASES;
void isValidEvmAddressFromChains; void CATEGORIES;
