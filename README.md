# OLI SDK (Read-Only)

> Type-safe TypeScript/JavaScript client for reading the Open Labels Initiative (OLI) public label pool over REST.

This package focuses exclusively on **read** scenarios: fetching labels, analytics, and helper summaries. All write helpers have been removed so the surface area is small, predictable, and browser-friendly.

## ✨ Highlights

- **Single REST surface** – every helper tunnels through `/labels`, `/attestations`, `/trust-lists`, and `/analytics`, with optional caching and automatic retries.
- **Dynamic schema loading** – tag definitions & value sets refresh from GitHub so you always validate against the latest standard.
- **Zero write/dependency footprint** – no signer, node provider, or trust setup required; everything runs against the public REST API.
- **Helper summaries** – built-in helpers provide display-ready summaries without shipping extra UI-specific code.
- **Proxy helper** – drop-in middleware injects API keys for browser apps without exposing credentials.

## ⚠️ Trust & Label Pool Disclaimer

- The SDK reads from the **open OLI label pool** (currently mirrored through, OLI's Live REST API, public GitHub exports and the growthepie API for projects metadata). All records are community-generated and **should be considered untrusted data** until weighted by your own allow-lists. 
- `oli.api.getBestLabelForAddress()` is intentionally simple: it removes revoked/expired labels, applies your optional filters, sorts by recency, and returns the first hit. There is **no attester weighting or trust scoring** yet.
- `oli.api.getValidLabelsForAddress()` / `helpers.isLabelValid()` only check revocation + expiration. **“Valid” does not mean “verified” or “safe.”**
- Trust algorithms (attester weighting, consensus scoring, label provenance checks) are **not implemented yet** but will be there soon as its development is almost complete. Keep humans-in-the-loop or apply your own policy layer before surfacing data to end users or triggering automated flows. See [`docs/TRUST.md`](docs/TRUST.md) for more context.




```bash
npm install @openlabels/oli-sdk
# or
yarn add @openlabels/oli-sdk
```

## ⚙️ Configuring the Client

```typescript
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

await oli.init(); // pulls latest tag definitions & value sets
```

### Notable configuration fields

| Path | Description |
|------|-------------|
| `api.apiKey` | Required for protected endpoints (`/labels`, `/addresses/search`, `/analytics`). |
| `filters.allowedCategories / excludedCategories / allowedProjects` | Include/exclude categories or projects globally. |
| `filters.minAge / maxAge` | Filter labels by age (seconds). |
| `display.nameFields / addressFormat / dateFormat` | Customize formatting defaults for helper outputs. |

## 🔐 Getting an API Key

To use protected endpoints in the SDK, you'll need an API key.

1. Go to the [Open Labels developer portal](https://www.openlabelsinitiative.org/developer) and click **Sign in**.
2. Approve the short GitHub OAuth authorization.
3. Complete the registration form with your contact email, project name, and intended use—this quick step helps prevent spam and usually takes less than a minute.
4. After submitting, your API key will be generated instantly (displayed in the portal, ONLY ONCE).
5. Safely store your API key in your secrets manager or in a `.env` file (e.g., `OLI_API_KEY=...`). Then, provide it to the SDK via `api.apiKey` or use the proxy helper for browser apps.

> **Need full API endpoint documentation or want to explore more details?**  
> Check out the API reference at [OLI's API Reference](https://www.openlabelsinitiative.org/docs?section=api-reference).

## 🚀 Quick Start

### 1. Display name for an address

```typescript
const name = await oli.api.getDisplayName('0x1234...');
console.log(name); // "Uniswap Router" (or fallback short address)
```

### 2. UI-ready summary

```typescript
const summary = await oli.api.getAddressSummary('0x1234...', {
  limit: 50
});

if (!summary) {
  console.log('No labels yet');
} else {
  console.log(summary.displayName, summary.primaryCategory, summary.latestActivity);
}
```

### 3. Bulk labels + search

```typescript
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

### 4. Latest attestations

```typescript
const feed = await oli.api.getLatestAttestations({ limit: 25 });
feed.forEach(att => {
  console.log(att.recipient, att.contract_name, att.timeCreated);
});
```

## 📚 Helper Overview

| Helper | Purpose |
|--------|---------|
| `oli.api.getLabels`, `getLabelsBulk`, `getAttestations`, `getAttestationsExpanded` | Raw REST payloads (requires API key for `/labels`). |
| `oli.api.getDisplayName`, `getAddressSummary`, `getBestLabelForAddress`, `getValidLabelsForAddress` | Higher-level helpers with filtering, ranking, and formatting baked in. |
| `oli.api.getLatestAttestations`, `searchAttestations`, `getAttesterLeaderboard`, `getAttesterAnalytics`, `getTagBreakdown` | Feed + analytics helpers for dashboards. |
| `helpers.*` | Pure utility helpers (formatting, ranking, REST response expansion) that power the `oli.api` methods. |
| `oli.fetcher.getOLITags`, `getOLIValueSets`, `getFullRawExport` | Access raw schema/value-set data and the open label pool exports. |
| `createProxyHandler` | Express/Next.js middleware that forwards requests to the OLI API while injecting `x-api-key`. |

> `getBestLabelForAddress` ranks by validity + recency only, and `getValidLabelsForAddress` simply filters revoked/expired labels. Neither helper performs attester trust weighting—plan to layer your own review logic until the official trust algorithms ship.

## 🌐 Proxy Example

```typescript
// /pages/api/oli/[...path].ts (Next.js API route)
import { createProxyHandler } from '@openlabels/oli-sdk/proxy';

export default createProxyHandler({
  apiKey: process.env.OLI_API_KEY!,
  forwardHeaders: ['authorization']
});
```

## 🧪 Development

```bash
npm run lint    # eslint flat config
npm run build   # bundle to dist/
npm test        # integration tests (uses tsx)
```

> Tests spin up local listeners. If you run them in a restricted environment, you may need to grant permission for IPC sockets.

## 📝 License

MIT © Open Labels Initiative
