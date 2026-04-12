/**
 * Open Labels Initiative (OLI) SDK
 * 
 * A TypeScript/JavaScript SDK for querying address labels from the Open Labels Initiative.
 * Provides easy access to on-chain and off-chain label attestations with dynamic type support.
 * 
 * @packageDocumentation
 */

// Main client
export { OLIClient } from './client';

// Sub-modules
export { DataFetcher } from './fetcher';
export { RestClient } from './rest';
export { AttestClient } from './attest';
export { createProxyHandler } from './proxy';
export type { ProxyHandlerOptions } from './proxy';
export {
  PROJECTS_URL,
  fetchProjects,
  resolveProjectsList,
  resetProjectsCache,
  isProjectFieldSimilar,
  findSimilarProjectMatches,
  findSimilarProjects,
  getSmartProjectSuggestions,
  getProjectValidation,
  validateProjectId
} from './projects';
export {
  applyProjectPatchToPayload,
  buildProjectPayloadFromDraft,
  createGitHubPullRequestClient,
  DEFAULT_CONTRIBUTION_REPOSITORIES,
  ensureProjectFilePath,
  GitHubPullRequestClient,
  inferLogoExtension,
  normalizeProjectSlug,
  parseProjectYaml,
  reorderProjectPayload,
  serializeProjectYaml,
  submitProjectContribution,
  validateProjectPayload
} from './contributions';

// Types - Common
export type {
  OLIConfig,
  LabelDisplayConfig,
  LabelFilterConfig,
  APIConfig,
  ResolvedAPIConfig
} from './types/common';
export { DEFAULT_API_CONFIG } from './types/common';

// Types - Client
export type {
  IOLIClient
} from './types/client';

// Types - Tags
export type {
  JSONSchema,
  RawTagDefinition,
  TagDefinition,
  TagDefinitions,
  ValueSets,
  TagDefinitionsResponse,
  UsageCategory,
  UsageCategoriesResponse
} from './types/tags';

// Types - REST API
export type {
  LabelsQueryParams,
  LabelsResponse,
  BulkLabelsRequest,
  BulkLabelsResponse,
  LabelSearchResponse,
  AddressWithLabel,
  AttestationPayload,
  AttestationSig,
  AttestationTypes,
  AttestationTypesField,
  AttestationDomain,
  AttestationMessage,
  AttestationSignatureFields,
  SingleAttestationResponse,
  BulkAttestationRequest,
  BulkAttestationResponse,
  RestAttestationQueryParams,
  RestAttestationQueryResponse,
  RestAttestationRecord,
  AttesterAnalyticsQueryParams,
  AttesterAnalyticsResponse,
  AttesterAnalytics,
  TagBreakdownQueryParams,
  TagBreakdownResponse,
  TagBreakdownItem,
  HTTPValidationError,
  ValidationError,
  LabelItem,
  AddressLabels
} from './types/api';
export { RestAPIError } from './rest';

// Types - Attestations
export type {
  RawAttestation,
  DecodedDataItem,
  ExpandedAttestation,
  CommonOLITags
} from './types/attestation';

// Helper utilities
export * as helpers from './helpers';
export type { LabelSummary } from './helpers';

// Attest (write) APIs
export {
  createDynamicWalletAdapter,
  simpleProfile,
  advancedProfile
} from './attest';
export type {
  AttestationFieldValue,
  AttestationRowInput,
  ProjectRecord,
  AttestationMode,
  AttestationModeProfile,
  AttestationModeProfileName,
  ValidationOptions as AttestValidationOptions,
  PrepareSingleOptions,
  ParseCsvOptions,
  AttestationDiagnostic,
  AttestationDiagnostics,
  CsvParseResult,
  SingleValidationResult,
  BulkValidationResult,
  AttestationNetworkConfig,
  PreparedAttestation,
  OnchainAttestationRequestData,
  OnchainAttestationRequest,
  OnchainSubmitContext,
  OnchainTxResult,
  OnchainWalletAdapter,
  OnchainSubmitResult,
  BulkOnchainSubmitResult
} from './attest';
export { AttestValidationError } from './attest';
export { DIAGNOSTIC_CODES } from './attest/validation/diagnostics';
export type { DiagnosticCode } from './attest/validation/diagnostics';

export type {
  ProjectSimilarityField,
  ProjectSimilarityMatch,
  ProjectValidationResult,
  ResolveProjectsListOptions
} from './projects';

// Default export
export { OLIClient as default } from './client';
