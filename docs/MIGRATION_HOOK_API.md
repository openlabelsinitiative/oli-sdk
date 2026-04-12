# Hook API Migration: Flat → Grouped

**Applies to:** `@openlabels/oli-sdk` — upgrade to the new grouped return shape
**Entry point changed:** `@openlabels/oli-sdk/attest-ui`
**Interfaces changed:** `SingleAttestUIController`, `BulkCsvAttestUIController`

---

## Overview

Both hook controllers were restructured from a flat object into namespaced sub-objects. Every property and method is still present — they have been grouped and some have been renamed.

---

## `useSingleAttestUI` — Full Mapping Table

| Old (flat) property / method | New location | Notes |
|---|---|---|
| `mode` | `mode` | unchanged |
| `setMode(mode)` | `setMode(mode)` | unchanged |
| `row` | `row` | unchanged |
| `fields` | `fields` | unchanged |
| `setRow(row)` | `setRow(row)` | unchanged |
| `setField(field, value)` | `setField(field, value)` | unchanged |
| `diagnostics` | `diagnostics.all` | moved into `diagnostics` namespace |
| `applySuggestion(field, suggestion)` | `diagnostics.applySuggestion(field, suggestion)` | moved |
| `applyDiagnosticSuggestion(diag, fallback?)` | `diagnostics.applyFromDiagnostic(diag, fallback?)` | moved + renamed |
| `validation.loading` | `validation.isRunning` | renamed |
| `validation.error` | `validation.error` | unchanged |
| `validation.result` | `validation.result` | unchanged |
| `validate(overrides?)` | `validation.run(overrides?)` | moved into `validation` namespace |
| `prepare(overrides?)` | `submission.prepare(overrides?)` | moved into `submission` namespace |
| `submit(walletAdapter?, overrides?)` | `submission.submit(walletAdapter?, overrides?)` | moved into `submission` namespace |
| `submission.loading` | `submission.isSubmitting` | renamed |
| `submission.error` | `submission.error` | unchanged |
| `submission.result` | `submission.result` | unchanged |
| `reset(row?)` | `reset(row?)` | unchanged |

---

## `useBulkCsvAttestUI` — Full Mapping Table

| Old (flat) property / method | New location | Notes |
|---|---|---|
| `mode` | `mode` | unchanged |
| `setMode(mode)` | `setMode(mode)` | unchanged |
| `rows` | `queue.rows` | moved into `queue` namespace |
| `columns` | `queue.columns` | moved into `queue` namespace |
| `setRows(rows)` | `queue.setRows(rows)` | moved |
| `setColumns(cols)` | `queue.setColumns(cols)` | moved |
| `setCell(rowIndex, field, value)` | `queue.setCell(rowIndex, field, value)` | moved |
| `addRow(row?)` | `queue.addRow(row?)` | moved |
| `removeRow(rowIndex)` | `queue.removeRow(rowIndex)` | moved |
| `diagnostics` | `diagnostics.all` | moved into `diagnostics` namespace |
| `getRowDiagnostics(rowIndex)` | `diagnostics.getRow(rowIndex)` | moved + renamed |
| `getFieldDiagnostics(rowIndex, field)` | `diagnostics.getField(rowIndex, field)` | moved + renamed |
| `getFieldError(rowIndex, field)` | `diagnostics.getFieldError(rowIndex, field)` | moved |
| `applySuggestion(rowIndex, field, suggestion)` | `diagnostics.applySuggestion(rowIndex, field, suggestion)` | moved |
| `applyDiagnosticSuggestion(diag, fallback?)` | `diagnostics.applyFromDiagnostic(diag, fallback?)` | moved + renamed |
| `parseCsvText(csvText, overrides?)` | `csv.parse(csvText, overrides?)` | moved into `csv` namespace + renamed |
| `csv.loading` | `csv.isLoading` | renamed |
| `csv.error` | `csv.error` | unchanged |
| `csv.result` | `csv.result` | unchanged |
| `validate(overrides?)` | `validation.run(overrides?)` | moved into `validation` namespace + renamed |
| `validation.loading` | `validation.isRunning` | renamed |
| `validation.error` | `validation.error` | unchanged |
| `validation.result` | `validation.result` | unchanged |
| `submit(params?)` | `submission.submit(params?)` | moved into `submission` namespace |
| `submission.loading` | `submission.isSubmitting` | renamed |
| `submission.error` | `submission.error` | unchanged |
| `submission.result` | `submission.result` | unchanged |
| `reset(rows?)` | `reset(rows?)` | unchanged |

---

## Before / After Code Examples

### Validate and apply suggestion (single)

```tsx
// Before
await controller.validate();
const diag = controller.diagnostics.suggestions[0];
controller.applySuggestion(diag.field!, diag.suggestion!);

// After
await controller.validation.run();
const diag = controller.diagnostics.all.suggestions[0];
controller.diagnostics.applySuggestion(diag.field!, diag.suggestion!);
```

### Submit single attestation

```tsx
// Before
await controller.submit(walletAdapter);
if (controller.submission.result?.status === 'success') { /* ... */ }

// After
await controller.submission.submit(walletAdapter);
if (controller.submission.result?.status === 'success') { /* ... */ }
```

### Reading validation loading state in UI

```tsx
// Before
<button disabled={controller.validation.loading}>
  {controller.validation.loading ? 'Validating...' : 'Validate'}
</button>

// After
<button disabled={controller.validation.isRunning}>
  {controller.validation.isRunning ? 'Validating...' : 'Validate'}
</button>
```

### Parse CSV (bulk)

```tsx
// Before
await controller.parseCsvText(csvText);

// After
await controller.csv.parse(csvText);
```

### Accessing rows and setting a cell (bulk)

```tsx
// Before
const rows = controller.rows;
controller.setCell(0, 'address', '0x...');
controller.addRow({});
controller.removeRow(1);

// After
const rows = controller.queue.rows;
controller.queue.setCell(0, 'address', '0x...');
controller.queue.addRow({});
controller.queue.removeRow(1);
```

### Reading per-row diagnostics (bulk)

```tsx
// Before
const rowDiags = controller.getRowDiagnostics(0);
const fieldDiags = controller.getFieldDiagnostics(0, 'address');
const fieldError = controller.getFieldError(0, 'address');

// After
const rowDiags = controller.diagnostics.getRow(0);
const fieldDiags = controller.diagnostics.getField(0, 'address');
const fieldError = controller.diagnostics.getFieldError(0, 'address');
```

### Render validation + submit buttons (bulk)

```tsx
// Before
<button disabled={controller.validation.loading} onClick={() => controller.validate()}>
  {controller.validation.loading ? 'Validating...' : 'Validate'}
</button>
<button disabled={controller.submission.loading} onClick={() => controller.submit({ walletAdapter })}>
  {controller.submission.loading ? 'Submitting...' : 'Submit'}
</button>

// After
<button disabled={controller.validation.isRunning} onClick={() => controller.validation.run()}>
  {controller.validation.isRunning ? 'Validating...' : 'Validate'}
</button>
<button disabled={controller.submission.isSubmitting} onClick={() => controller.submission.submit({ walletAdapter })}>
  {controller.submission.isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

---

## Machine-Readable Rename Map

The following JSON represents every renamed symbol. Keys are old paths, values are new paths. All paths are relative to the controller object.

```json
{
  "diagnostics": "diagnostics.all",
  "applySuggestion": "diagnostics.applySuggestion",
  "applyDiagnosticSuggestion": "diagnostics.applyFromDiagnostic",
  "validate": "validation.run",
  "validation.loading": "validation.isRunning",
  "prepare": "submission.prepare",
  "submit": "submission.submit",
  "submission.loading": "submission.isSubmitting",
  "rows": "queue.rows",
  "columns": "queue.columns",
  "setRows": "queue.setRows",
  "setColumns": "queue.setColumns",
  "setCell": "queue.setCell",
  "addRow": "queue.addRow",
  "removeRow": "queue.removeRow",
  "parseCsvText": "csv.parse",
  "csv.loading": "csv.isLoading",
  "getRowDiagnostics": "diagnostics.getRow",
  "getFieldDiagnostics": "diagnostics.getField",
  "getFieldError": "diagnostics.getFieldError"
}
```
