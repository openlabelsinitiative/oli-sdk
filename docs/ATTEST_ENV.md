---
title: "Environment Variables"
description: "All environment variables used by the OLI SDK."
---

# Environment Variables

## Variable Reference

| Variable | Required By | Server-Only? | Description |
|----------|-------------|--------------|-------------|
| `OLI_API_KEY` | `OLIClient` read APIs | Yes | Server-side API key for protected endpoints (`/labels`, `/addresses/search`, `/analytics`). Never expose in browser bundles — use the proxy helper instead. |
| `NEXT_PUBLIC_OLI_API_KEY` | Browser fallback | No | Browser-accessible API key fallback. Prefer setting up a proxy route with `createProxyHandler` to avoid exposing credentials in client bundles. |
| `OLI_API_BASE_URL` | `OLIClient` (server) | Yes | Optional override for the OLI API base URL. Useful for staging environments or self-hosted API instances. |
| `NEXT_PUBLIC_OLI_API_BASE_URL` | `OLIClient` (browser) | No | Browser-accessible version of the base URL override. |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Dynamic wallet provider | No | Required by the Dynamic React provider when using Dynamic wallet auth and connect flows. Frontend-only — do not read in server-only contexts. |
| `OLI_COINBASE_PAYMASTER_URL` | `createDynamicWalletAdapter` | Yes | Preferred paymaster URL for Coinbase Smart Wallet sponsorship. Works in Node and in bundlers that inline `process.env`. |
| `NEXT_PUBLIC_COINBASE_PAYMASTER_URL` | `createDynamicWalletAdapter` | No | Browser-accessible paymaster URL fallback. Used when `OLI_COINBASE_PAYMASTER_URL` is not set. |
| `GITHUB_TOKEN` | Contributions module | Yes | GitHub Personal Access Token passed as `auth.token` to `submitProjectContribution`. Never use a `NEXT_PUBLIC_` prefix — this must remain server-side only. |
| `RUN_LIVE_TESTS` | Test suite | No | Set to `1` to enable live API smoke tests. Safe to omit in most CI environments. |

## Paymaster URL Resolution

The paymaster URL used for Coinbase Smart Wallet sponsorship is resolved in this order:

1. `createDynamicWalletAdapter(wallet, { paymasterUrl })` — explicit argument takes highest priority
2. Submission context `paymasterUrl` passed to `submitSingleOnchain` / `submitBulkOnchain`
3. `OLI_COINBASE_PAYMASTER_URL` env var
4. `NEXT_PUBLIC_COINBASE_PAYMASTER_URL` env var

If none of these are set, the sponsored transaction attempt throws and the SDK automatically falls back to a regular unsponsored transaction. The result always includes `sponsored: boolean` so you can inspect which path was taken.

## API Key Security

- Use `OLI_API_KEY` in server-side code (API routes, server components, CLI scripts).
- For browser apps, set up the proxy helper so your key never reaches the client bundle:

```ts
// pages/api/oli/[...path].ts
import { createProxyHandler } from '@openlabels/oli-sdk';

export default createProxyHandler({
  apiKey: process.env.OLI_API_KEY!,
  forwardHeaders: ['authorization']
});
```

- Only use `NEXT_PUBLIC_OLI_API_KEY` if you cannot set up a proxy and accept the exposure risk.

## GitHub Token

The contributions module does not read `process.env.GITHUB_TOKEN` automatically. You must pass the token explicitly at call time:

```ts
import { submitProjectContribution } from '@openlabels/oli-sdk/contributions';

await submitProjectContribution({
  auth: { token: process.env.GITHUB_TOKEN },
  // ...
});
```

Always call this from a server-side route. Never expose `GITHUB_TOKEN` in a `NEXT_PUBLIC_` variable.

## Complete .env Template

```bash
# ── OLI API ──────────────────────────────────────────────────────────────────
# Server-side API key (required for protected read endpoints)
OLI_API_KEY=

# Browser fallback (prefer proxy route — see docs)
NEXT_PUBLIC_OLI_API_KEY=

# Optional: override the OLI API base URL (e.g. staging)
OLI_API_BASE_URL=
NEXT_PUBLIC_OLI_API_BASE_URL=

# ── Dynamic Wallet ────────────────────────────────────────────────────────────
# Required for Dynamic wallet connect/auth UI
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=

# ── Coinbase Paymaster ────────────────────────────────────────────────────────
# Server-safe paymaster URL (preferred)
OLI_COINBASE_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/<your-key>

# Browser-accessible fallback
NEXT_PUBLIC_COINBASE_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/<your-key>

# ── Contributions ─────────────────────────────────────────────────────────────
# GitHub PAT for OSS Directory PR automation (server-side only)
GITHUB_TOKEN=

# ── Testing ───────────────────────────────────────────────────────────────────
# Set to 1 to enable live API smoke tests
RUN_LIVE_TESTS=
```
