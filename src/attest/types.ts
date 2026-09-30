import type { ChainMetadata } from './core/chains';

/** A chain supplied by the host app when building a `ChainRegistry`. */
export interface ChainInput {
  /** CAIP-2 chain ID, e.g. `'eip155:4663'`. */
  caip2: string;
  /** Display name, e.g. `'Robinhood Chain'`. */
  name: string;
  /** Lookup key, e.g. `'robinhood'`. Defaults to `caip2`. */
  id?: string;
  /** Short display name. Defaults to `name`. */
  shortName?: string;
}

export interface ChainRegistry {
  /** Chains in this registry: host chains first, then built-ins not overridden. */
  chains: ChainMetadata[];
  /** Lower-cased CAIP-2 ID → chain. */
  byCaip2: Map<string, ChainMetadata>;
  /** Lower-cased id / name / shortName / alias → canonical CAIP-2 ID. */
  byName: Map<string, string>;
}

export interface UsageCategoryRecord {
  id: string;
  name: string;
  description?: string;
}

export interface UsageCategoryRegistry {
  /** All categories returned by the remote source. */
  all: UsageCategoryRecord[];
  /**
   * Subset of `all` that this registry considers valid.
   * Equals `all` when no `allowedIds` / `filter` was applied.
   */
  allowed: UsageCategoryRecord[];
  /** O(1) membership set for the `allowed` subset. */
  allowedIds: Set<string>;
}

export type AttestationPrimitive = string | number | boolean;
export type AttestationFieldValue = AttestationPrimitive | AttestationPrimitive[] | null | undefined;

export interface AttestationRowInput {
  [field: string]: AttestationFieldValue;
  chain_id?: string;
  address?: string;
  attestation_network?: number;
}

export interface ProjectRecord {
  owner_project: string;
  display_name?: string;
  main_github?: string;
  website?: string;
  [key: string]: unknown;
}

export type AttestationModeProfileName = 'simpleProfile' | 'advancedProfile';

export interface AttestationModeProfile {
  id: AttestationModeProfileName;
  label: string;
  allowedFields: string[];
  requiresFields: string[];
}

export type AttestationMode = AttestationModeProfileName | AttestationModeProfile;

export interface ValidationOptions {
  mode?: AttestationMode;
  projects?: ProjectRecord[];
  fetchProjects?: () => Promise<ProjectRecord[]>;
  maxRows?: number;
  allowedFields?: string[];
  /**
   * When provided, all `usage_category` validation and suggestions are scoped
   * to this registry instead of the SDK's static built-in list.
   * Build one with `createUsageCategoryRegistry()` from `@openlabels/oli-sdk/chains`.
   */
  usageCategoryRegistry?: UsageCategoryRegistry;
  /**
   * Chains used to resolve chain names and to recognise chains (unrecognised EVM
   * chains get a `CHAIN_UNRECOGNIZED` warning, not an error). Defaults to the
   * SDK's built-in list. Build one with `createChainRegistry()` from `@openlabels/oli-sdk/chains`.
   */
  chainRegistry?: ChainRegistry;
}

export interface PrepareSingleOptions {
  mode?: AttestationMode;
  attestationNetwork?: number;
  recipient?: string;
  validate?: boolean;
  projects?: ProjectRecord[];
  fetchProjects?: () => Promise<ProjectRecord[]>;
  /** Chain registry used during pre-encode validation. See `ValidationOptions.chainRegistry`. */
  chainRegistry?: ChainRegistry;
}

export interface ParseCsvOptions {
  mode?: AttestationMode;
  projects?: ProjectRecord[];
  fetchProjects?: () => Promise<ProjectRecord[]>;
  allowedFields?: string[];
  /** Registry used to scope `usage_category` validation within the CSV pipeline. */
  usageCategoryRegistry?: UsageCategoryRegistry;
  /** Chain registry used to convert chain names/IDs in the `chain_id` column. */
  chainRegistry?: ChainRegistry;
}

export interface AttestationDiagnostic {
  code: string;
  message: string;
  row?: number;
  field?: string;
  suggestion?: string;
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

export interface AttestationDiagnostics {
  errors: AttestationDiagnostic[];
  warnings: AttestationDiagnostic[];
  conversions: AttestationDiagnostic[];
  suggestions: AttestationDiagnostic[];
}

export interface CsvParseResult {
  rows: AttestationRowInput[];
  columns: string[];
  headerMap: Record<string, string | null>;
  diagnostics: AttestationDiagnostics;
}

export interface SingleValidationResult {
  valid: boolean;
  row: AttestationRowInput;
  diagnostics: AttestationDiagnostics;
}

export interface BulkValidationResult {
  valid: boolean;
  rows: AttestationRowInput[];
  validRows: AttestationRowInput[];
  invalidRows: number[];
  diagnostics: AttestationDiagnostics;
}

export interface AttestationNetworkConfig {
  chainId: number;
  name: string;
  easContractAddress: string;
  schemaUID: string;
  schemaDefinition: string;
  explorerUrl: string;
}

export interface PreparedAttestation {
  mode: AttestationModeProfileName;
  network: AttestationNetworkConfig;
  recipient: string;
  chainId: string;
  address: string;
  caip10: string;
  tags: Record<string, unknown>;
  encodedData: string;
  raw: AttestationRowInput;
  request: OnchainAttestationRequestData;
}

export interface OnchainAttestationRequestData {
  recipient: string;
  expirationTime: bigint;
  revocable: boolean;
  refUID: string;
  data: string;
  value: bigint;
}

export interface OnchainAttestationRequest {
  schemaUID: string;
  data: OnchainAttestationRequestData;
  prepared: PreparedAttestation;
}

export interface OnchainSubmitContext {
  network: AttestationNetworkConfig;
  paymasterUrl?: string;
}

export interface OnchainTxResult {
  status: 'success' | 'submitted' | 'failed';
  txHash?: string;
  uids?: string[];
  raw?: unknown;
}

/**
 * Wallet adapter interface that the attestation pipeline uses to sign and
 * broadcast transactions. Implement this to integrate any wallet library.
 *
 * @example
 * ```ts
 * // Use the built-in Dynamic adapter:
 * const adapter = createDynamicWalletAdapter(primaryWallet);
 * await attest.submitSingleOnchain(prepared, adapter);
 * ```
 */
export interface OnchainWalletAdapter {
  /** Human-readable adapter name used in error messages. */
  name?: string;
  /** Return the currently connected chain ID. */
  getChainId(): Promise<number>;
  /**
   * Switch the wallet to the given EVM chain ID.
   * @param chainId - Target chain ID.
   */
  switchNetwork(chainId: number): Promise<void>;
  /**
   * Return `true` if EIP-5792 fee sponsorship is available for `chainId`.
   * When absent the pipeline assumes no sponsorship.
   */
  isSponsorshipSupported?(chainId: number): Promise<boolean>;
  /**
   * Submit a single `attest` call to the EAS contract.
   * @param request - Encoded attestation request.
   * @param context - Network config and optional paymaster URL.
   */
  attest(request: OnchainAttestationRequest, context: OnchainSubmitContext): Promise<OnchainTxResult>;
  /**
   * Submit a `multiAttest` call to the EAS contract.
   * @param requests - Array of encoded attestation requests (same schema UID).
   * @param context - Network config and optional paymaster URL.
   */
  multiAttest(requests: OnchainAttestationRequest[], context: OnchainSubmitContext): Promise<OnchainTxResult>;
  /** Sponsored variant of `attest` (uses EIP-5792 `wallet_sendCalls`). */
  sponsoredAttest?(request: OnchainAttestationRequest, context: OnchainSubmitContext): Promise<OnchainTxResult>;
  /** Sponsored variant of `multiAttest` (uses EIP-5792 `wallet_sendCalls`). */
  sponsoredMultiAttest?(requests: OnchainAttestationRequest[], context: OnchainSubmitContext): Promise<OnchainTxResult>;
}

export interface OnchainSubmitResult {
  status: 'success' | 'submitted' | 'failed';
  txHash?: string;
  uids: string[];
  sponsored: boolean;
  network: {
    chainId: number;
    name: string;
    explorerUrl: string;
  };
  raw?: unknown;
}

export interface BulkOnchainSubmitResult extends OnchainSubmitResult {
  results: Array<{
    row: number;
    uid?: string;
    status: 'success' | 'failed';
  }>;
}

export class AttestValidationError extends Error {
  public readonly diagnostics: AttestationDiagnostics;

  constructor(message: string, diagnostics: AttestationDiagnostics) {
    super(message);
    this.name = 'AttestValidationError';
    this.diagnostics = diagnostics;
  }
}
