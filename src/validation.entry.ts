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

export {
  validateUsageCategory,
  getUsageCategorySuggestions
} from './attest/validation/usageCategoryRegistry';
