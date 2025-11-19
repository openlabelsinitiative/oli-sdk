# Trust & Label Pool Primer

The SDK is intentionally **read-only** and consumes the public Open Labels Initiative label pool. This document outlines what the helpers currently do (and do *not* do) so you can layer your own policies until the official trust algorithms through transitive trust land.

## Where the Data Comes From

- **Tag definitions & schema**: Pulled directly from the `openlabelsinitiative/OLI` GitHub repository at runtime.
- **Value sets**: Derived from those tag definitions, plus public JSON feeds such as `https://api.growthepie.com/v1/labels/projects.json`.
- **Label pool**: Aggregated, open-sourced label exports are fetched from growthepie (`labels_raw.json`, `labels_decoded.json`) or the OLI's live REST API.

Treat every record as **untrusted input** until you have applied your own validation, allow-lists, or human review.

## “Best Label” Helper

`helpers.getBestLabel()` and `oli.api.getBestLabelForAddress()` follow a very small heuristic set:

1. Remove labels that are revoked or expired (`helpers.isLabelValid()`).
2. Apply any caller-provided filters (category, project, age).
3. Sort the remaining labels so that non-revoked entries appear before revoked ones, ordered by `timeCreated` (newest first).
4. Return the first item.

There is **no attester weighting, trust score, or consensus logic** in this step. It is adequate for UI previews, but you must still decide whether the attester can be trusted for your use case.

## “Valid Labels” Helper

`oli.api.getValidLabelsForAddress()` (aka the “vali” helper) is equally lightweight:

- It only ensures a label has **not been revoked** and is **not expired**.
- It does **not** check which attester issued the label, whether that attester is in good standing, or whether multiple attestations agree.

Again, “valid” simply means “not explicitly invalidated by the attester.”

## Recommended Next Steps

- Maintain your own attester/trust allow-list until the official trust algorithms (consensus weighting, decay, appeal flow) ship.
- Show disclaimers inside your UI when surfacing the raw label data or best label summary.
- If you cannot apply a trust policy yet, keep humans-in-the-loop for any action that depends on these labels.
