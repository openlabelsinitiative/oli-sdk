---
title: "OLI SDK Documentation"
description: "Complete reference for the @openlabels/oli-sdk package."
---

# OLI SDK Documentation

The OLI SDK is a type-safe TypeScript/JavaScript client for the Open Labels Initiative. It lets you read community-generated address labels from the OLI label pool, submit onchain attestations via EAS, and automate project contributions to the OSS Directory — all from a single npm package.

## Package Structure

| Subpath | Description |
|---------|-------------|
| `@openlabels/oli-sdk` | `OLIClient`, read APIs (`oli.api.*`), helpers, proxy middleware |
| `@openlabels/oli-sdk/attest` | `AttestClient`, `createDynamicWalletAdapter`, write profiles |
| `@openlabels/oli-sdk/attest-ui` | React hooks and unstyled components for attestation UIs |
| `@openlabels/oli-sdk/projects` | Project lookup, typo suggestions, and similarity matching |
| `@openlabels/oli-sdk/contributions` | GitHub PR automation for OSS Directory project onboarding |
| `@openlabels/oli-sdk/react` | Re-export of `attest-ui` for React-centric import paths |

## What Do You Want to Do?

### Read address labels
Use `OLIClient` and the `oli.api.*` helpers. See the [Quick Start — Read APIs](../README.md#quick-start--read-apis) section in the README.

### Submit attestations onchain
Follow the step-by-step [Attestation Quickstart](ATTEST_QUICKSTART.md) guide covering single form flows, bulk CSV, and applying suggestions.

### Add React UI components
See [Attest UI Components](ATTEST_UI_COMPONENTS.md) for headless hooks (`useSingleAttestUI`, `useBulkCsvAttestUI`) and the unstyled primitive components.

### Contribute a project to the OSS Directory
See the [Contributions Module](CONTRIBUTIONS_MODULE.md) for the backend-only GitHub PR automation workflow.

### Validate or look up project names
See the [Projects Module](PROJECTS_MODULE.md) for `validateProjectId`, `getSmartProjectSuggestions`, and similarity matching.

## All Documentation Pages

| File | Title | Description |
|------|-------|-------------|
| [ATTEST_QUICKSTART.md](ATTEST_QUICKSTART.md) | Attestation Quickstart | End-to-end walkthrough: single form, bulk CSV, suggestions, React hooks |
| [ATTEST_API.md](ATTEST_API.md) | Attestation API Reference | Full method signatures, parameter tables, type shapes, guardrails |
| [ATTEST_DYNAMIC_WALLET.md](ATTEST_DYNAMIC_WALLET.md) | Dynamic Wallet Integration | Adapter setup, sponsorship behavior, runtime fallback logic |
| [ATTEST_ENV.md](ATTEST_ENV.md) | Environment Variables | Every env var the SDK reads, with a complete `.env` template |
| [ATTEST_UI_COMPONENTS.md](ATTEST_UI_COMPONENTS.md) | Attest UI Components | Headless React hooks and configurable unstyled primitives |
| [PROJECTS_MODULE.md](PROJECTS_MODULE.md) | Projects Module | Project lookup, typo suggestions, and field-level similarity matching |
| [CONTRIBUTIONS_MODULE.md](CONTRIBUTIONS_MODULE.md) | Contributions Module | Automated OSS Directory YAML and logo PR creation |
| [ATTEST_MIGRATION.md](ATTEST_MIGRATION.md) | Migration Guide | Moving custom frontend attest logic into `oli.attest.*` |
| [TRUST.md](TRUST.md) | Trust & Label Pool Primer | Data provenance, helper limitations, and recommended trust policies |

## Environment Variables at a Glance

| Variable | Required By | Secret? |
|----------|-------------|---------|
| `OLI_API_KEY` | `OLIClient` read APIs (server-side) | Yes |
| `NEXT_PUBLIC_OLI_API_KEY` | Browser fallback (prefer proxy instead) | Yes |
| `OLI_API_BASE_URL` | Optional API base URL override (server) | No |
| `NEXT_PUBLIC_OLI_API_BASE_URL` | Optional API base URL override (browser) | No |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Dynamic wallet provider | No |
| `OLI_COINBASE_PAYMASTER_URL` | Coinbase paymaster URL (server-safe) | Yes |
| `NEXT_PUBLIC_COINBASE_PAYMASTER_URL` | Coinbase paymaster URL (browser fallback) | Yes |
| `GITHUB_TOKEN` | Contributions module (server only) | Yes |
| `RUN_LIVE_TESTS` | Test suite flag | No |

See [ATTEST_ENV.md](ATTEST_ENV.md) for full details and a complete `.env` template.
