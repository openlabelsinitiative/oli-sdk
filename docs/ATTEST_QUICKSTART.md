---
title: "Attestation Quickstart"
description: "Get onchain attestations working in minutes."
---

# Attestation Quickstart

## 1. Prerequisites

Initialize `OLIClient` and create a wallet adapter before calling any write APIs.

```ts
import { OLIClient } from '@openlabels/oli-sdk';

const oli = new OLIClient({ api: { apiKey: process.env.OLI_API_KEY! } });
await oli.init(); // fetches latest tag definitions and value sets
```

```ts
import { createDynamicWalletAdapter } from '@openlabels/oli-sdk/attest';

const adapter = createDynamicWalletAdapter(primaryWallet, {
  paymasterUrl: process.env.NEXT_PUBLIC_COINBASE_PAYMASTER_URL
});
```

See [Dynamic Wallet Integration](ATTEST_DYNAMIC_WALLET.md) for adapter setup details and sponsorship behavior. See [Environment Variables](ATTEST_ENV.md) for paymaster configuration.

## 2. Single Attestation

Build an input object, prepare it, then submit onchain.

```ts
const input = {
  chain_id: 'eip155:8453',
  address: '0x1234567890123456789012345678901234567890',
  usage_category: 'dex',
  owner_project: 'uniswap'
};

// Optionally validate first
const validation = await oli.attest.validateSingle(input, { mode: 'simpleProfile' });
if (!validation.valid) {
  console.log(validation.diagnostics.errors);
  return;
}

// Prepare (encodes the attestation data)
const prepared = await oli.attest.prepareSingleAttestation(input, { mode: 'simpleProfile' });

// Submit
const result = await oli.attest.submitSingleOnchain(prepared, adapter);
console.log(result.status, result.txHash, result.sponsored);
```

## 3. Bulk CSV Attestation

Parse a CSV string, validate all rows, then submit the valid ones onchain.

```ts
// Parse CSV text (handles header aliasing, CAIP normalization, etc.)
const parsed = await oli.attest.parseCsv(csvText);

// Validate all rows
const validation = await oli.attest.validateBulk(parsed.rows, { mode: 'advancedProfile' });

// Check for blocking errors before submitting
if (validation.diagnostics.errors.length > 0) {
  console.log('Errors to fix:', validation.diagnostics.errors);
  return;
}

// Submit valid rows (max 50 per call)
const result = await oli.attest.submitBulkOnchain(validation.validRows, adapter);
console.log(result.status, result.uids);
```

`validation.validRows` contains only rows that passed all checks. `validation.invalidRows` is an array of row indices that had errors.

## 4. Applying Suggestions

The validation step emits structured suggestions for fields like `usage_category`, `owner_project`, and `chain_id`. Use `applySuggestion` to apply them before submitting.

```ts
const validation = await oli.attest.validateBulk(parsed.rows, { mode: 'advancedProfile' });
let rows = [...parsed.rows];

for (const suggestion of validation.diagnostics.suggestions) {
  if (suggestion.field && suggestion.suggestions?.length) {
    const rowIndex = suggestion.row ?? 0;
    rows[rowIndex] = oli.attest.applySuggestion(
      rows[rowIndex],
      suggestion.field,
      suggestion.suggestions[0]
    );
  }
}

// Re-validate after applying suggestions
const final = await oli.attest.validateBulk(rows, { mode: 'advancedProfile' });
const result = await oli.attest.submitBulkOnchain(final.validRows, adapter);
```

## 5. React Hooks

For React applications, the `attest-ui` subpath provides controller hooks that wire up state, validation, and submission into a single API surface.

```ts
import { useSingleAttestUI, useBulkCsvAttestUI } from '@openlabels/oli-sdk/attest-ui';

const singleController = useSingleAttestUI(oli.attest, {
  mode: 'simpleProfile',
  walletAdapter: adapter,
  onSubmitted: (result) => console.log(result.txHash)
});

const bulkController = useBulkCsvAttestUI(oli.attest, {
  mode: 'advancedProfile',
  walletAdapter: adapter
});
```

See [Attest UI Components](ATTEST_UI_COMPONENTS.md) for the full hook API, render-prop modules, and unstyled primitive components.
