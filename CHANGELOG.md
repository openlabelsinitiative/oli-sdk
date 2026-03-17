# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

### Added

#### Contributions — deterministic branch naming (Problem 1)
- **`ContributionBranchOptions`** type (`{ branchName?, branchPrefix? }`). Added to `EditProjectInput.branch` and `SubmitProjectContributionInput.branch`.
- **`GitHubFileChangeRequest.branchName`** — when provided, `GitHubPullRequestClient` tries that exact name first, then appends `-2`, `-3` … up to 10 attempts on 422 collisions. Legacy timestamp/random behavior is preserved when `branchName` is absent.
- `SubmitProjectContributionInput.branchPrefix` is now `@deprecated` in favour of `branch.branchPrefix`.

#### Contributions — first-class YAML edit support (Problem 2)
- **`patchProjectYamlText(existingYamlText, patch)`** — two-pass edit helper in `yaml.ts`. Pass 1 applies only the specified `EditProjectPatch` fields via `applyProjectPatchToPayload` (all unmentioned fields are preserved). Pass 2 re-serializes with canonical key ordering. `social.twitter` and `social.telegram` are merged into the existing `social` map so other platforms (farcaster, discord, etc.) are preserved.
- **`EditProjectPatch`** type — typed subset of editable fields: `displayName`, `description`, `websites`, `github`, `twitter`, `telegram`.
- **`EditProjectInput`** type — full input type for `submitProjectEditContribution`.
- **`SubmitProjectEditContributionResult`** type.
- **`fetchExistingProjectYaml(auth, slug, options?)`** — fetches the current YAML text and blob SHA for a slug from GitHub using the canonical `ensureProjectFilePath(slug)` path. Returns `null` when the file doesn't exist.
- **`submitProjectEditContribution(input)`** — high-level edit flow: fetch → patch → open PR. Uses `ensureProjectFilePath` internally so frontends don't duplicate path logic.

#### Contributions — canonical path resolver (Problem 3)
- `ensureProjectFilePath(slug)` is now used by both `submitProjectContribution` and `submitProjectEditContribution`. Re-exported from `edit.ts` for consumers who need the resolver standalone.

#### Contributions — logo variant replacement (Problem 4)
- **`ProjectLogoContribution.replaceVariants`** (`boolean`) — when `true`, deletes sibling files in the same directory on the branch whose filename matches `<slug>.*` but has a different extension (e.g. writing `avon.png` deletes `avon.svg`).
- **`GitHubFileChangeRequest.deleteOtherExtensions`** (`boolean`) — lower-level flag that drives the same cleanup inside `GitHubPullRequestClient.createOrUpdatePullRequest`.
- **`GitHubPullRequestClient.fetchFileContents(owner, repo, filePath, ref?)`** — new public method; returns `{ content: string; sha: string } | null`. Used internally by `submitProjectEditContribution` and available to consumers who need to read a file before editing.

#### Usage-category registry — dynamic validation (Problem 5)
- **`UsageCategoryRecord`** type (`{ id, name, description? }`).
- **`UsageCategoryRegistry`** type (`{ all, allowed, allowedIds: Set<string> }`).
- **`DEFAULT_USAGE_CATEGORY_SOURCE`** — canonical OLI GitHub raw URL for `usage_category.yml`.
- **`fetchUsageCategories(input?)`** — fetches and parses the OLI usage-category YAML with an in-process TTL cache (default 300 s). Accepts `sourceUrl`, `fetchImpl`, `revalidateSeconds`.
- **`createUsageCategoryRegistry(input?)`** — builds a `UsageCategoryRegistry` with optional `allowedIds` list and/or `filter` predicate. Host apps can scope the registry to only the IDs they support.
- **`validateUsageCategory(value, registry?)`** — registry-aware replacement for `validateCategory`. Falls back to the SDK's static list when no registry is provided.
- **`getUsageCategorySuggestions(value, registry?)`** — registry-aware suggestion engine (same multi-strategy scoring as the existing internal helper). Suggestions are always scoped to `registry.allowed` when a registry is provided.
- **`ValidationOptions.usageCategoryRegistry`** — when set, all `usage_category` validation, alias suggestions, and error suggestions inside `validateSingle` / `validateBulk` are scoped to the registry.
- **`ParseCsvOptions.usageCategoryRegistry`** — same scoping for the CSV parsing pipeline.
- **`validateCategory(value, registry?)`** in `fieldValidators.ts` now accepts an optional registry.

### Exports
- `@openlabels/oli-sdk/chains` now exports: `fetchUsageCategories`, `createUsageCategoryRegistry`, `validateUsageCategory`, `getUsageCategorySuggestions`, `DEFAULT_USAGE_CATEGORY_SOURCE`, `UsageCategoryRecord` (type), `UsageCategoryRegistry` (type).
- `@openlabels/oli-sdk/validation` now exports: `validateUsageCategory`, `getUsageCategorySuggestions`.
- `@openlabels/oli-sdk/contributions` now exports: `ContributionBranchOptions`, `EditProjectPatch`, `EditProjectInput`, `SubmitProjectEditContributionResult`, `patchProjectYamlText`, `fetchExistingProjectYaml`, `submitProjectEditContribution`.


## [0.2.0] - 2026-02-27

### Added
- **`/validation` subpath** — Exposes all field-level validators (`validateAddressForChain`, `validateContractName`, `validateTxHash`, `validateURL`, `validateBoolean`, etc.) plus the new `DIAGNOSTIC_CODES` constant object for consumers who need to match on diagnostic `.code` strings without hardcoding literals.
- **`/chains` subpath** — Exposes chain metadata (`CHAINS`, `CHAIN_OPTIONS`, `CHAIN_ALIASES`), CAIP-10 utilities (`parseCaip10`, `buildCaip10`, `normalizeChainId`), address utilities (`isValidEvmAddress`, `toChecksumAddress`), and category data (`CATEGORIES`, `VALID_CATEGORY_IDS`, `convertCategoryAlias`).
- **`DIAGNOSTIC_CODES` constant** — Re-exported from the root `@openlabels/oli-sdk` and `@openlabels/oli-sdk/attest` subpaths. Covers all 31 diagnostic codes used internally by the validation and CSV pipeline.
- **`DiagnosticCode` type** — Derived union type of all `DIAGNOSTIC_CODES` values; exported alongside the constant.
- **`src/` shipped with the package** — Added `"src"` to the `files` array in `package.json` so TypeScript source maps resolve correctly in consumer debug sessions.

### Changed
- **Hook API restructured (breaking)** — `SingleAttestUIController` and `BulkCsvAttestUIController` return values are now grouped into namespaced sub-objects (`diagnostics`, `validation`, `submission`, `queue`, `csv`). See [docs/MIGRATION_HOOK_API.md](docs/MIGRATION_HOOK_API.md) for the complete flat → grouped mapping table and before/after code examples.
  - `validation.loading` → `validation.isRunning`
  - `submission.loading` → `submission.isSubmitting`
  - `csv.loading` → `csv.isLoading`
  - `validate(…)` → `validation.run(…)`
  - `prepare(…)` → `submission.prepare(…)`
  - `submit(…)` → `submission.submit(…)`
  - `parseCsvText(…)` → `csv.parse(…)`
  - `applySuggestion(…)` → `diagnostics.applySuggestion(…)`
  - `applyDiagnosticSuggestion(…)` → `diagnostics.applyFromDiagnostic(…)`
  - `rows`, `columns`, `setRows`, `setColumns`, `setCell`, `addRow`, `removeRow` → moved under `queue.*`
  - `getRowDiagnostics(…)` → `diagnostics.getRow(…)`
  - `getFieldDiagnostics(…)` → `diagnostics.getField(…)`
  - `getFieldError(…)` → `diagnostics.getFieldError(…)`
- **DTS bundling** — Changed tsup `dts` option from `true` to `{ resolve: true }` to inline all shared types directly into each entry-point declaration file, eliminating hash-named chunk files (`api-*.d.ts`, `types-*.d.ts`).
- **JSDoc** — Added or improved documentation on `AttestClient` methods, `createDynamicWalletAdapter`, `OnchainWalletAdapter`, `submitProjectContribution`, `SubmitProjectContributionInput`, all validator functions, CAIP utilities, and address helpers.

### Fixed
- Private-property type conflicts when consumers compose SDK types — resolved by the DTS `resolve: true` change above.

### Tests
- Added `tests/consumer/type-check.ts` — a type-only integration test that imports from every public subpath as a downstream consumer would and confirms type correctness via `tsc --noEmit`.
- Added `npm run test:types` script.


## [0.1.1] - 2025-12-05

### Added
- **Attestation UI hooks** — `useSingleAttestUI` and `useBulkCsvAttestUI` React hooks with configurable single/bulk attestation workflows, inline diagnostics, and suggestion application.
- **React UI components** — `SingleAttestForm` and `BulkCsvTable` headless components built on top of the UI hooks.
- **`SingleAttestModule` / `BulkCsvAttestModule`** — Render-prop wrappers for the UI hooks; compatible with any React tree without prop-drilling the `AttestClient`.
- **`/attest-ui` subpath** — Dedicated entry point for the React UI layer; peer-dependency on React ≥ 18, optional.
- **Scoped diagnostics helpers** — `getFieldDiagnostics`, `getRowDiagnostics`, and `getFieldError` on the bulk controller for fine-grained per-cell error display.
- **Stable row remap algorithm** — Diagnostics follow rows across edits using a two-pass strict + relaxed row-index mapping so error indicators don't jump after row mutations.


## [0.1.0] - 2025-11-19

This is the first release of the refreshed `@openlabels/oli-sdk` package and serves as the new baseline for the relocated repository. The previously published `@openlabels/sdk@0.1.1` build has been deprecated on npm; use this `0.1.0` release going forward.

### Added
- REST-first, read-only `OLIClient` that wraps `/labels`, `/attestations`, `/analytics`, and proxy helpers.
- Dynamic schema + value-set loader (`DataFetcher`) that keeps the SDK aligned with the public OLI tag definitions without shipping new builds.
- Proxy helper for Next.js/Express apps that injects `x-api-key` without exposing credentials to the browser.
- Helper utilities for formatting addresses, selecting the best label by recency, and filtering labels per category/project/time window.
- Zod-powered runtime validation for critical REST responses.
- Documentation disclaimer describing how the public label pool, `getBestLabelForAddress`, and `getValidLabelsForAddress` should be treated until the upcoming trust algorithms land.


[Unreleased]: https://github.com/openlabelsinitiative/oli-sdk/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/openlabelsinitiative/oli-sdk/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/openlabelsinitiative/oli-sdk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/openlabelsinitiative/oli-sdk/releases/tag/v0.1.0
