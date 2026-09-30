---
title: "Attestation API Reference"
description: "Complete reference for oli.attest.* write APIs and the AttestClient."
---

# Attestation API Reference

## Import Paths

All `oli.attest.*` methods are available on every `OLIClient` instance after `await oli.init()`:

```ts
import { OLIClient } from '@openlabels/oli-sdk';

const oli = new OLIClient({ api: { apiKey: process.env.OLI_API_KEY! } });
await oli.init();

oli.attest.parseCsv(...)
oli.attest.validateSingle(...)
oli.attest.validateBulk(...)
oli.attest.prepareSingleAttestation(...)
oli.attest.submitSingleOnchain(...)
oli.attest.submitBulkOnchain(...)
oli.attest.applySuggestion(...)
```

You can also import the `AttestClient` and wallet adapter directly from the `/attest` subpath:

```ts
import { AttestClient, createDynamicWalletAdapter } from '@openlabels/oli-sdk/attest';
```

## Method Reference

### `parseCsv(csvText, options?)`

Parses a CSV string into normalized attestation rows. Handles header aliasing, whitespace cleanup, CAIP chain normalization, and category/paymaster alias correction.

| Parameter | Type | Description |
|-----------|------|-------------|
| `csvText` | `string` | Raw CSV text including header row |
| `options` | `ParseCsvOptions` | Optional: `mode`, `projects`, `fetchProjects`, `allowedFields` |

**Returns:** `Promise<CsvParseResult>`

```ts
const result = await oli.attest.parseCsv(csvText);
// result.rows       — normalized AttestationRowInput[]
// result.columns    — detected column names
// result.headerMap  — mapping from CSV header -> canonical field name
// result.diagnostics — warnings/conversions from normalization
```

---

### `validateSingle(row, options?)`

Validates a single attestation row against the current tag definitions and value sets.

| Parameter | Type | Description |
|-----------|------|-------------|
| `row` | `AttestationRowInput` | Input row to validate |
| `options` | `ValidationOptions` | Optional: `mode`, `projects`, `fetchProjects`, `maxRows`, `allowedFields` |

**Returns:** `Promise<SingleValidationResult>`

```ts
const result = await oli.attest.validateSingle(input, { mode: 'simpleProfile' });
// result.valid       — boolean
// result.row         — the (possibly normalized) row
// result.diagnostics — errors, warnings, suggestions
```

---

### `validateBulk(rows, options?)`

Validates an array of attestation rows. Emits per-row, per-field diagnostics. Enforces the 50-row maximum.

| Parameter | Type | Description |
|-----------|------|-------------|
| `rows` | `AttestationRowInput[]` | Array of input rows (max 50) |
| `options` | `ValidationOptions` | Optional: `mode`, `projects`, `fetchProjects`, `maxRows`, `allowedFields` |

**Returns:** `Promise<BulkValidationResult>`

```ts
const result = await oli.attest.validateBulk(rows, { mode: 'advancedProfile' });
// result.valid       — true only if ALL rows are valid
// result.rows        — all rows (normalized)
// result.validRows   — rows that passed validation
// result.invalidRows — indices of rows with errors
// result.diagnostics — aggregated diagnostics across all rows
```

---

### `prepareSingleAttestation(row, options?)`

Validates and encodes a single row into a `PreparedAttestation` ready for onchain submission. Throws `AttestValidationError` if validation fails.

| Parameter | Type | Description |
|-----------|------|-------------|
| `row` | `AttestationRowInput` | Input row to prepare |
| `options` | `PrepareSingleOptions` | Optional: `mode`, `attestationNetwork`, `recipient`, `validate`, `projects`, `fetchProjects` |

**Returns:** `Promise<PreparedAttestation>`

```ts
const prepared = await oli.attest.prepareSingleAttestation(input, {
  mode: 'simpleProfile'
});
// prepared.network     — AttestationNetworkConfig
// prepared.encodedData — ABI-encoded attestation data
// prepared.request     — OnchainAttestationRequestData
```

---

### `submitSingleOnchain(prepared, walletAdapter, context?)`

Submits a prepared attestation onchain via the wallet adapter. Handles network switching, optional sponsorship, and fallback to unsponsored transaction.

| Parameter | Type | Description |
|-----------|------|-------------|
| `prepared` | `PreparedAttestation` | Output of `prepareSingleAttestation` |
| `walletAdapter` | `OnchainWalletAdapter` | Wallet adapter (e.g. from `createDynamicWalletAdapter`) |
| `context` | `OnchainSubmitContext` | Optional: `network`, `paymasterUrl` |

**Returns:** `Promise<OnchainSubmitResult>`

```ts
const result = await oli.attest.submitSingleOnchain(prepared, adapter);
// result.status    — 'success' | 'submitted' | 'failed'
// result.txHash    — transaction hash
// result.uids      — EAS attestation UIDs
// result.sponsored — whether sponsorship was used
// result.network   — { chainId, name, explorerUrl }
```

---

### `submitBulkOnchain(rows, walletAdapter, context?, options?)`

Validates, prepares, and submits multiple rows in a single `multiAttest` call. Enforces the 50-row maximum.

| Parameter | Type | Description |
|-----------|------|-------------|
| `rows` | `AttestationRowInput[]` | Rows to submit (must already be valid; use `validRows` from `validateBulk`) |
| `walletAdapter` | `OnchainWalletAdapter` | Wallet adapter |
| `context` | `OnchainSubmitContext` | Optional: `network`, `paymasterUrl` |
| `options` | `ValidationOptions` | Optional: `mode`, `projects`, etc. |

**Returns:** `Promise<BulkOnchainSubmitResult>`

```ts
const result = await oli.attest.submitBulkOnchain(validation.validRows, adapter);
// result.status    — overall status
// result.txHash    — transaction hash
// result.uids      — all UIDs in submission order
// result.sponsored — whether sponsorship was used
// result.results   — per-row { row, uid, status }
```

---

### `applySuggestion(row, field, suggestion)`

Returns a new row with a suggested value applied to the specified field. Synchronous and pure — does not mutate the input.

| Parameter | Type | Description |
|-----------|------|-------------|
| `row` | `AttestationRowInput` | The row to update |
| `field` | `string` | Field name to update (e.g. `'usage_category'`, `'owner_project'`) |
| `suggestion` | `string` | The suggested value to apply |

**Returns:** `AttestationRowInput`

```ts
const updated = oli.attest.applySuggestion(row, 'usage_category', 'dex');
```

---

## Diagnostics Shape

All validation and parsing APIs return structured `AttestationDiagnostics`:

```ts
interface AttestationDiagnostics {
  errors: AttestationDiagnostic[];       // Blocking — row cannot be submitted
  warnings: AttestationDiagnostic[];     // Non-blocking — submission allowed
  conversions: AttestationDiagnostic[];  // Auto-applied normalizations (info only)
  suggestions: AttestationDiagnostic[];  // Actionable corrections to apply
}

interface AttestationDiagnostic {
  code: string;                 // Machine-readable error/warning code
  message: string;              // Human-readable description
  row?: number;                 // Row index (bulk operations)
  field?: string;               // Field name the diagnostic applies to
  suggestion?: string;          // Single suggested value
  suggestions?: string[];       // Ranked list of suggested values
  metadata?: Record<string, unknown>;
}
```

Use `suggestions` diagnostics with `applySuggestion` to correct rows before submission. Use `errors` diagnostics to surface blocking issues to users.

## Mode Profiles

Two built-in profiles control which fields are allowed and required:

| Profile | Description |
|---------|-------------|
| `simpleProfile` | Minimal field set: `chain_id`, `address`, `usage_category`, `owner_project`. Suitable for basic single-form attestation UIs. |
| `advancedProfile` | Extended field set including `contract_name`, `paymaster_category`, and additional metadata fields. Suitable for bulk CSV flows and power users. |

Pass the profile name as a string or import the profile object:

```ts
import { simpleProfile, advancedProfile } from '@openlabels/oli-sdk/attest';

// As a string
await oli.attest.validateSingle(row, { mode: 'simpleProfile' });

// As a profile object (allows custom allowedFields)
await oli.attest.validateSingle(row, { mode: advancedProfile });
```

## Supported Networks

| Network | Chain ID | EAS Deployment |
|---------|----------|----------------|
| Base | `8453` | Coinbase Smart Wallet sponsorship supported |
| Arbitrum One | `42161` | Sponsorship not supported; regular tx only |

These are the networks attestations are written to. The `attestation_network` field on `AttestationRowInput` overrides the resolved network when set explicitly. The chain being labelled (`chain_id`) is separate, see below.

## Chain IDs

`chain_id` is a CAIP-2 identifier, as defined by the OLI label schema.

- **Any EVM chain is valid**: `eip155:<chain id>` and `eip155:any` pass validation whether or not the chain is in the SDK's list. A chain that isn't in the list gets a `CHAIN_UNRECOGNIZED` **warning** (not an error), so typos are still visible.
- **Non-EVM chains** (e.g. `starknet:SN_MAIN`) must be in the chain registry.
- **Conversion** (`convertChainId`, CSV `chain_id` column): plain numbers become `eip155:<n>`; names, ids and aliases (`"base"`, `"Robinhood Chain"`, `"arb"`) are looked up in the chain registry.

By default the registry is the SDK's built-in `CHAINS` list. Host apps can supply their own chains so new chains work without an SDK release:

```ts
import { createChainRegistry, getChainOptions } from '@openlabels/oli-sdk/chains';

const chainRegistry = createChainRegistry({
  chains: [{ id: 'robinhood', name: 'Robinhood Chain', caip2: 'eip155:4663' }],
  aliases: { rh: 'eip155:4663' }, // optional
  includeBuiltIn: true            // default: merge with the SDK's CHAINS / CHAIN_ALIASES
});

await oli.attest.parseCsv(csvText, { chainRegistry });
await oli.attest.validateBulk(rows, { chainRegistry });
await oli.attest.prepareSingleAttestation(row, { chainRegistry });

const options = getChainOptions(chainRegistry); // [{ value: 'eip155:4663', label: 'Robinhood Chain' }, ...]
```

Host chains override built-in entries with the same CAIP-2 ID. `useSingleAttestUI` and `useBulkCsvAttestUI` pick the registry up from `validationOptions.chainRegistry` (and `parseOptions.chainRegistry` for CSV).

## Guardrails

- **Max 50 rows** per bulk submission call. Exceeding this throws before any submission is attempted.
- **Required fields**: `chain_id` and `address` are always required. Additional required fields depend on the active mode profile.
- **CAIP parsing**: `chain_id` values are normalized to CAIP-2 format. Aliases like `"base"` and `"1"` are resolved automatically; see [Chain IDs](#chain-ids).
- **Category validation**: `usage_category` and `paymaster_category` are validated against the live OLI value sets fetched at `oli.init()` time.
- **Project validation**: `owner_project` is validated against the OSS Directory project list. Typo suggestions are emitted for near-matches.

## Related Subpaths

### `@openlabels/oli-sdk/attest-ui`

React hooks and unstyled components for building attestation UIs. See [Attest UI Components](ATTEST_UI_COMPONENTS.md).

```ts
import { useSingleAttestUI, useBulkCsvAttestUI } from '@openlabels/oli-sdk/attest-ui';
import { SingleAttestForm, BulkCsvTable } from '@openlabels/oli-sdk/attest-ui';
```

### `@openlabels/oli-sdk/projects`

Project lookup, validation, and similarity matching used during attestation validation. See [Projects Module](PROJECTS_MODULE.md).

```ts
import { fetchProjects, validateProjectId, getSmartProjectSuggestions } from '@openlabels/oli-sdk/projects';
```
