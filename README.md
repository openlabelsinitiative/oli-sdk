# OLI SDK

> Type-safe TypeScript/JavaScript client for reading OLI address labels and submitting onchain attestations.

## Install

```bash
npm install @openlabels/oli-sdk
```

## Modules

| Subpath | Description |
|---------|-------------|
| `@openlabels/oli-sdk` | `OLIClient`, read APIs (`oli.api.*`), helpers, proxy middleware |
| `@openlabels/oli-sdk/attest` | `AttestClient`, `createDynamicWalletAdapter`, write profiles |
| `@openlabels/oli-sdk/attest-ui` | React hooks and unstyled components for attestation UIs |
| `@openlabels/oli-sdk/projects` | Project lookup, typo suggestions, and similarity matching |
| `@openlabels/oli-sdk/contributions` | GitHub PR automation for OSS Directory project onboarding |
| `@openlabels/oli-sdk/react` | Re-export of `attest-ui` for React-centric import paths |

## Getting an API Key

To use protected endpoints in the SDK, you need an API key.

1. Go to the [Open Labels developer portal](https://www.openlabelsinitiative.org/developer) and click **Sign in**.
2. Approve the short GitHub OAuth authorization.
3. Complete the registration form with your contact email, project name, and intended use. This usually takes less than a minute.
4. After submitting, your API key is generated instantly and displayed in the portal (shown only once).
5. Store it securely in your secrets manager or `.env` file (e.g. `OLI_API_KEY=...`), then provide it to the SDK via `api.apiKey` or use the proxy helper for browser apps.

> Need full API endpoint documentation? See the [OLI API Reference](https://www.openlabelsinitiative.org/docs?section=api-reference).

## Trust & Label Pool Disclaimer

- The SDK reads from the **open OLI label pool** (mirrored through the OLI Live REST API, public GitHub exports, and the growthepie API). All records are community-generated and **should be considered untrusted data** until weighted by your own allow-lists.
- `oli.api.getBestLabelForAddress()` removes revoked/expired labels, applies optional filters, sorts by recency, and returns the first hit. There is **no attester weighting or trust scoring**.
- `oli.api.getValidLabelsForAddress()` / `helpers.isLabelValid()` only check revocation and expiration. **"Valid" does not mean "verified" or "safe."**
- Trust algorithms (attester weighting, consensus scoring, label provenance checks) are **not yet implemented**. Keep humans in the loop or apply your own policy layer before surfacing data to end users. See [`docs/TRUST.md`](docs/TRUST.md) for details.

## Quick Start — Read APIs

### Display name for an address

```ts
const name = await oli.api.getDisplayName('0x1234...');
console.log(name); // "Uniswap Router" (or fallback short address)
```

### UI-ready address summary

```ts
const summary = await oli.api.getAddressSummary('0x1234...', { limit: 50 });

if (!summary) {
  console.log('No labels yet');
} else {
  console.log(summary.displayName, summary.primaryCategory, summary.latestActivity);
}
```

### Bulk labels and search

```ts
const bulk = await oli.api.getLabelsBulk({
  addresses: ['0x1234...', '0xABCD...'],
  limit_per_address: 10
});

const paymasters = await oli.api.searchAddressesByTag({
  tag_id: 'is_paymaster',
  tag_value: 'true',
  limit: 20
});
```

### Latest attestations

```ts
const feed = await oli.api.getLatestAttestations({ limit: 25 });
feed.forEach(att => {
  console.log(att.recipient, att.contract_name, att.timeCreated);
});
```

## Quick Start — Attest (Write)

### Single form flow

```ts
import { OLIClient } from '@openlabels/oli-sdk';
import { createDynamicWalletAdapter } from '@openlabels/oli-sdk/attest';

const oli = new OLIClient({ api: { apiKey: process.env.OLI_API_KEY! } });
await oli.init();

const adapter = createDynamicWalletAdapter(primaryWallet, {
  paymasterUrl: process.env.NEXT_PUBLIC_COINBASE_PAYMASTER_URL
});

const input = {
  chain_id: 'eip155:8453',
  address: '0x1234567890123456789012345678901234567890',
  usage_category: 'dex',
  owner_project: 'uniswap'
};

const prepared = await oli.attest.prepareSingleAttestation(input, { mode: 'simpleProfile' });
const result = await oli.attest.submitSingleOnchain(prepared, adapter);
console.log(result.status, result.txHash, result.sponsored);
```

### Bulk CSV flow

```ts
const parsed = await oli.attest.parseCsv(csvText);
const validation = await oli.attest.validateBulk(parsed.rows, { mode: 'advancedProfile' });

if (validation.diagnostics.errors.length > 0) {
  console.log('Fix errors before submitting:', validation.diagnostics.errors);
  return;
}

const result = await oli.attest.submitBulkOnchain(validation.validRows, adapter);
console.log(result.status, result.uids);
```

## Client Configuration

```ts
import { OLIClient } from '@openlabels/oli-sdk';

const oli = new OLIClient({
  api: {
    apiKey: process.env.OLI_API_KEY!,
    enableCache: true,
    cacheTtl: 30_000
  },
  filters: {
    allowedCategories: ['dex', 'bridge'],
    maxAge: 86_400
  },
  display: {
    addressFormat: 'short',
    dateFormat: 'relative'
  }
});

await oli.init(); // pulls latest tag definitions and value sets
```

### Notable configuration fields

| Path | Description |
|------|-------------|
| `api.apiKey` | Required for protected endpoints (`/labels`, `/addresses/search`, `/analytics`). |
| `filters.allowedCategories` / `excludedCategories` / `allowedProjects` | Include or exclude categories/projects globally. |
| `filters.minAge` / `maxAge` | Filter labels by age in seconds. |
| `display.nameFields` / `addressFormat` / `dateFormat` | Customize formatting defaults for helper outputs. |

## Proxy Helper

Use `createProxyHandler` in a Next.js API route to forward browser requests to the OLI API while keeping your API key server-side.

```ts
// pages/api/oli/[...path].ts
import { createProxyHandler } from '@openlabels/oli-sdk';

export default createProxyHandler({
  apiKey: process.env.OLI_API_KEY!,
  forwardHeaders: ['authorization']
});
```

## Helper Overview

| Helper | Purpose |
|--------|---------|
| `oli.api.getLabels`, `getLabelsBulk`, `getAttestations`, `getAttestationsExpanded` | Raw REST payloads. Requires API key for `/labels`. |
| `oli.api.getDisplayName`, `getAddressSummary`, `getBestLabelForAddress`, `getValidLabelsForAddress` | Higher-level helpers with filtering, ranking, and formatting. |
| `oli.api.getLatestAttestations`, `searchAttestations`, `getAttesterLeaderboard`, `getAttesterAnalytics`, `getTagBreakdown` | Feed and analytics helpers for dashboards. |
| `helpers.*` | Pure utility helpers (formatting, ranking, REST response expansion) that power `oli.api` methods. |
| `oli.fetcher.getOLITags`, `getOLIValueSets`, `getFullRawExport` | Access raw schema/value-set data and open label pool exports. |
| `createProxyHandler` | Express/Next.js middleware that forwards requests to the OLI API while injecting `x-api-key`. |

## Documentation

| File | Description |
|------|-------------|
| [`docs/index.md`](docs/index.md) | Documentation landing page and navigation guide |
| [`docs/ATTEST_QUICKSTART.md`](docs/ATTEST_QUICKSTART.md) | End-to-end attestation walkthrough (single + bulk) |
| [`docs/ATTEST_API.md`](docs/ATTEST_API.md) | Full `oli.attest.*` method reference and type shapes |
| [`docs/ATTEST_DYNAMIC_WALLET.md`](docs/ATTEST_DYNAMIC_WALLET.md) | Dynamic wallet adapter setup and sponsorship behavior |
| [`docs/ATTEST_ENV.md`](docs/ATTEST_ENV.md) | All environment variables with a complete `.env` template |
| [`docs/ATTEST_UI_COMPONENTS.md`](docs/ATTEST_UI_COMPONENTS.md) | React hooks and unstyled component integration |
| [`docs/PROJECTS_MODULE.md`](docs/PROJECTS_MODULE.md) | Project lookup, validation, and similarity matching |
| [`docs/CONTRIBUTIONS_MODULE.md`](docs/CONTRIBUTIONS_MODULE.md) | GitHub PR automation for OSS Directory contributions |
| [`docs/ATTEST_MIGRATION.md`](docs/ATTEST_MIGRATION.md) | Migrating custom frontend logic to `oli.attest.*` |
| [`docs/TRUST.md`](docs/TRUST.md) | Trust model, data provenance, and label pool disclaimer |

## Development

```bash
npm run lint    # ESLint flat config
npm run build   # Bundle to dist/
npm test        # Integration tests (uses tsx)
```

> Tests spin up local listeners. In restricted environments you may need to grant permission for IPC sockets.

## License

MIT © Open Labels Initiative
