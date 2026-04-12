# Migration Notes: Frontend/Custom Logic -> `oli.attest.*`

## Previous Pattern

Apps typically maintained custom logic for:

- CSV header matching/cleanup
- chain/category/paymaster alias handling
- project typo suggestions
- per-row and per-field validation
- Dynamic wallet network/sponsored handling
- `attest`/`multiAttest` submission fallback logic

## New SDK Pattern

Move this logic into `oli.attest.*`:

1. Parse and normalize CSV

```ts
const parsed = await oli.attest.parseCsv(csvText);
```

2. Validate with profile

```ts
const validated = await oli.attest.validateBulk(parsed.rows, { mode: 'advancedProfile' });
```

3. Apply suggested corrections (optional)

```ts
const updated = oli.attest.applySuggestion(row, field, suggestion);
```

4. Submit onchain via wallet adapter

```ts
const adapter = createDynamicWalletAdapter(primaryWallet);
await oli.attest.submitBulkOnchain(validated.validRows, adapter);
```

## UI Migration Option

If you currently maintain custom single/bulk React screens, move to:

```ts
import { useSingleAttestUI, useBulkCsvAttestUI } from '@openlabels/oli-sdk/attest-ui';
```

These controllers keep the same write/validation behavior while letting you keep full control over styling and rendered markup.

## Project Similarity Migration Option

If you have custom project typo/similarity code in your app, move to:

```ts
import { validateProjectId, findSimilarProjectMatches } from '@openlabels/oli-sdk/projects';
```

## What You Can Delete From App Code

- Custom Levenshtein/fuzzy header mapping for attestation CSVs
- Category/paymaster alias correction tables
- Project typo/suggestion plumbing
- Manual CAIP parsing and chain normalization code
- Custom 50-row max guardrail checks
- Sponsored-then-regular fallback flow for Dynamic/Coinbase wallet cases

## Compatibility Notes

- Existing read-only APIs remain unchanged (`oli.api.*`, `oli.rest.*`, `helpers.*`)
- New write APIs are additive (`oli.attest.*`)
- Offchain/Hardhat flows are intentionally out of scope in this iteration
