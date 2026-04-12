---
title: "Attest UI Components"
description: "Headless React hooks and configurable unstyled primitives for single and bulk CSV attestation flows."
---

# Attest UI Components

The `@openlabels/oli-sdk/attest-ui` subpath provides React building blocks for attestation UIs. Styling is fully host-controlled — the SDK provides state, validation, and submission logic; your app controls markup and class names.

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `useSingleAttestUI` | Hook | Controller for a single-row attestation form |
| `useBulkCsvAttestUI` | Hook | Controller for a multi-row CSV attestation table |
| `SingleAttestModule` | Render-prop component | Wraps `useSingleAttestUI` as a render-prop |
| `BulkCsvAttestModule` | Render-prop component | Wraps `useBulkCsvAttestUI` as a render-prop |
| `SingleAttestForm` | Unstyled component | Default unstyled form using `useSingleAttestUI` |
| `BulkCsvTable` | Unstyled component | Default unstyled table using `useBulkCsvAttestUI` |

---

## `useSingleAttestUI`

```ts
import { useSingleAttestUI } from '@openlabels/oli-sdk/attest-ui';

const controller = useSingleAttestUI(oli.attest, options);
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `'simpleProfile' \| 'advancedProfile'` | Validation profile. Default: `'simpleProfile'` |
| `walletAdapter` | `OnchainWalletAdapter` | Wallet used for submission |
| `initialRow` | `AttestationRowInput` | Pre-populated form values |
| `includeFields` | `string[]` | Show only these fields |
| `excludeFields` | `string[]` | Hide these fields |
| `validationOptions` | `Omit<ValidationOptions, 'mode'>` | Extra validation config |
| `prepareOptions` | `Omit<PrepareSingleOptions, 'mode'>` | Extra prepare config |
| `onValidated` | `(result: SingleValidationResult) => void` | Called after each validation run |
| `onSubmitted` | `(result: OnchainSubmitResult) => void` | Called after successful submission |

### Controller API

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `mode` | `AttestationModeProfileName` | Current mode |
| `row` | `AttestationRowInput` | Current form state |
| `fields` | `FormField[]` | Visible fields for the current mode |
| `diagnostics` | `AttestationDiagnostics` | Latest validation diagnostics |
| `validation` | `{ status, result }` | Async validation state |
| `submission` | `{ status, result, error }` | Async submission state |
| `setMode(mode)` | `void` | Switch mode profile |
| `setRow(row)` | `void` | Replace entire row |
| `setField(field, value)` | `void` | Update a single field |
| `applySuggestion(field, suggestion)` | `void` | Apply a diagnostic suggestion |
| `applyDiagnosticSuggestion(diagnostic)` | `void` | Apply suggestion from a diagnostic object |
| `validate(overrides?)` | `Promise<SingleValidationResult>` | Run validation |
| `prepare(overrides?)` | `Promise<PreparedAttestation>` | Prepare without submitting |
| `submit(walletAdapter?, overrides?)` | `Promise<OnchainSubmitResult>` | Validate → prepare → submit |
| `reset(row?)` | `void` | Reset to initial state |

### Example — Headless

```ts
const controller = useSingleAttestUI(oli.attest, {
  mode: 'simpleProfile',
  walletAdapter,
  includeFields: ['chain_id', 'address', 'contract_name', 'owner_project', 'usage_category'],
  onSubmitted: (result) => console.log(result.status, result.txHash)
});

// In response to user input
controller.setField('address', '0x1234...');
controller.setField('usage_category', 'dex');

// Validate then submit
await controller.validate();
await controller.submit();
```

### Example — With `SingleAttestForm`

```ts
import { SingleAttestForm, useSingleAttestUI } from '@openlabels/oli-sdk/attest-ui';

const controller = useSingleAttestUI(oli.attest, { walletAdapter });

return (
  <SingleAttestForm
    controller={controller}
    classNames={{
      root: 'my-form',
      fieldRow: 'my-row',
      input: 'my-input',
      suggestionButton: 'my-chip'
    }}
    renderField={({ field, value, onChange, error }) => (
      <div>
        <label>{field.label}</label>
        <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        {error && <small className="error">{error.message}</small>}
      </div>
    )}
  />
);
```

---

## `useBulkCsvAttestUI`

```ts
import { useBulkCsvAttestUI } from '@openlabels/oli-sdk/attest-ui';

const controller = useBulkCsvAttestUI(oli.attest, options);
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `'simpleProfile' \| 'advancedProfile'` | Validation profile. Default: `'advancedProfile'` |
| `walletAdapter` | `OnchainWalletAdapter` | Wallet used for submission |
| `initialRows` | `AttestationRowInput[]` | Pre-populated rows |
| `initialColumns` | `string[]` | Column order to display |
| `allowedFields` | `string[]` | Constrain which fields can appear in rows |
| `includeFields` | `string[]` | Visible fields filter |
| `excludeFields` | `string[]` | Hidden fields filter |
| `parseOptions` | `Omit<ParseCsvOptions, 'mode'>` | Extra CSV parse config |
| `validationOptions` | `Omit<ValidationOptions, 'mode'>` | Extra validation config |
| `onParsed` | `(result: CsvParseResult) => void` | Called after CSV parse |
| `onValidated` | `(result: BulkValidationResult) => void` | Called after validation |
| `onSubmitted` | `(result: BulkOnchainSubmitResult) => void` | Called after submission |

### Controller API

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `mode` | `AttestationModeProfileName` | Current mode |
| `rows` | `AttestationRowInput[]` | Current row state (min 1 empty row) |
| `columns` | `string[]` | Current column order |
| `diagnostics` | `AttestationDiagnostics` | Remapped diagnostics tracking row edits |
| `csv` | `{ status, result }` | Async CSV parse state |
| `validation` | `{ status, result }` | Async validation state |
| `submission` | `{ status, result, error }` | Async submission state |
| `setMode(mode)` | `void` | Switch mode profile |
| `setRows(rows)` | `void` | Replace all rows |
| `setColumns(cols)` | `void` | Reorder columns |
| `setCell(rowIndex, field, value)` | `void` | Update a single cell |
| `addRow(row?)` | `void` | Append a row (max 50) |
| `removeRow(rowIndex)` | `void` | Remove a row |
| `parseCsvText(text, overrides?)` | `Promise<CsvParseResult>` | Parse raw CSV text |
| `validate(overrides?)` | `Promise<BulkValidationResult>` | Validate all rows |
| `applySuggestion(rowIndex, field, value)` | `void` | Apply suggestion to a cell |
| `applyDiagnosticSuggestion(diagnostic)` | `void` | Apply from diagnostic object |
| `getRowDiagnostics(rowIndex)` | `AttestationDiagnostics` | Diagnostics for a single row |
| `getFieldDiagnostics(rowIndex, field)` | `AttestationDiagnostics` | Diagnostics for a single cell |
| `getFieldError(rowIndex, field)` | `AttestationDiagnostic \| undefined` | First error for a cell |
| `submit(params?)` | `Promise<BulkOnchainSubmitResult>` | Validate → submit |
| `reset(rows?)` | `void` | Reset to initial state |

### Example — Headless

```ts
const controller = useBulkCsvAttestUI(oli.attest, {
  mode: 'advancedProfile',
  walletAdapter,
  onSubmitted: (result) => console.log(result.txHash, result.uids)
});

// Load from CSV text
await controller.parseCsvText(csvText);

// Validate and submit
const validation = await controller.validate();
if (validation.valid) {
  await controller.submit();
}
```

### Example — With `BulkCsvTable`

```ts
import { useBulkCsvAttestUI, BulkCsvTable } from '@openlabels/oli-sdk/attest-ui';

const controller = useBulkCsvAttestUI(oli.attest, { mode: 'advancedProfile', walletAdapter });

return (
  <BulkCsvTable
    controller={controller}
    classNames={{ table: 'my-table', input: 'my-input', cellError: 'my-error' }}
    renderCell={({ value, onChange, suggestions, onApplySuggestion }) => (
      <div>
        <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => onApplySuggestion(s)}>{s}</button>
        ))}
      </div>
    )}
  />
);
```

### Example — Render-prop module

```ts
import { BulkCsvAttestModule } from '@openlabels/oli-sdk/attest-ui';

<BulkCsvAttestModule attest={oli.attest} mode="advancedProfile" walletAdapter={walletAdapter}>
  {(controller) => (
    <div>
      <span>{controller.rows.length} rows</span>
      <button onClick={() => controller.submit()}>Submit</button>
    </div>
  )}
</BulkCsvAttestModule>
```

---

## Diagnostic Remapping

`useBulkCsvAttestUI` tracks row identity across edits. When rows are added, removed, or reordered, diagnostics are remapped to stay attached to the correct rows. A diagnostic for a field that was edited is discarded automatically — you do not need to manually clear stale errors.

## Related

- [Attestation API Reference](ATTEST_API.md) — underlying `oli.attest.*` methods
- [Attestation Quickstart](ATTEST_QUICKSTART.md) — end-to-end walkthrough
- [Dynamic Wallet Integration](ATTEST_DYNAMIC_WALLET.md) — wallet adapter setup
