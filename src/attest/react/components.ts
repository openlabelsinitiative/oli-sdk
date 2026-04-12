import { createElement, useState } from 'react';
import type { AttestationDiagnostic, AttestationDiagnostics } from '../types';
import type {
  BulkCsvCellRenderContext,
  BulkCsvTableLabels,
  BulkCsvTableProps,
  SingleAttestFieldRenderContext,
  SingleAttestFormLabels,
  SingleAttestFormProps
} from './uiTypes';

const DEFAULT_SINGLE_LABELS: Required<SingleAttestFormLabels> = {
  mode: 'Mode',
  simpleMode: 'Simple',
  advancedMode: 'Advanced',
  validate: 'Validate',
  submit: 'Submit Onchain',
  validationLoading: 'Validating...',
  submitLoading: 'Submitting...'
};

const DEFAULT_BULK_LABELS: Required<BulkCsvTableLabels> = {
  csvPlaceholder: 'Paste CSV text here...',
  parseCsv: 'Parse CSV',
  addRow: 'Add Row',
  removeRow: 'Remove',
  validate: 'Validate Rows',
  submit: 'Submit Onchain',
  validationLoading: 'Validating...',
  submitLoading: 'Submitting...'
};

function toTextValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(',');
  }
  return String(value);
}

function readInputValue(event: unknown): string {
  if (!event || typeof event !== 'object') {
    return '';
  }

  const target = (event as { target?: { value?: unknown } }).target;
  if (!target) {
    return '';
  }

  if (typeof target.value === 'string') {
    return target.value;
  }

  if (typeof target.value === 'number' || typeof target.value === 'boolean') {
    return String(target.value);
  }

  return '';
}

function getFieldError(diagnostics: {
  errors: AttestationDiagnostic[];
}, rowIndex: number, field: string): string | undefined {
  const entry = diagnostics.errors.find((diagnostic) => {
    const diagnosticRow = typeof diagnostic.row === 'number' ? diagnostic.row : 0;
    return diagnosticRow === rowIndex && diagnostic.field === field;
  });

  return entry?.message;
}

function collectSuggestions(
  diagnostics: {
    errors: AttestationDiagnostic[];
    suggestions: AttestationDiagnostic[];
  },
  rowIndex: number,
  field: string
): string[] {
  const bag = new Set<string>();

  diagnostics.suggestions.forEach((diagnostic) => {
    const diagnosticRow = typeof diagnostic.row === 'number' ? diagnostic.row : 0;
    if (diagnosticRow !== rowIndex || diagnostic.field !== field) {
      return;
    }

    if (typeof diagnostic.suggestion === 'string' && diagnostic.suggestion) {
      bag.add(diagnostic.suggestion);
    }

    diagnostic.suggestions?.forEach((suggestion) => {
      if (suggestion) {
        bag.add(suggestion);
      }
    });
  });

  diagnostics.errors.forEach((diagnostic) => {
    const diagnosticRow = typeof diagnostic.row === 'number' ? diagnostic.row : 0;
    if (diagnosticRow !== rowIndex || diagnostic.field !== field) {
      return;
    }

    if (typeof diagnostic.suggestion === 'string' && diagnostic.suggestion) {
      bag.add(diagnostic.suggestion);
    }

    diagnostic.suggestions?.forEach((suggestion) => {
      if (suggestion) {
        bag.add(suggestion);
      }
    });
  });

  return Array.from(bag).slice(0, 5);
}

function collectSuggestionsFromScopedDiagnostics(diagnostics: Pick<AttestationDiagnostics, 'errors' | 'suggestions'>): string[] {
  const bag = new Set<string>();

  diagnostics.suggestions.forEach((diagnostic) => {
    if (typeof diagnostic.suggestion === 'string' && diagnostic.suggestion) {
      bag.add(diagnostic.suggestion);
    }

    diagnostic.suggestions?.forEach((suggestion) => {
      if (suggestion) {
        bag.add(suggestion);
      }
    });
  });

  diagnostics.errors.forEach((diagnostic) => {
    if (typeof diagnostic.suggestion === 'string' && diagnostic.suggestion) {
      bag.add(diagnostic.suggestion);
    }

    diagnostic.suggestions?.forEach((suggestion) => {
      if (suggestion) {
        bag.add(suggestion);
      }
    });
  });

  return Array.from(bag).slice(0, 5);
}

export function SingleAttestForm(props: SingleAttestFormProps): unknown {
  const labels = {
    ...DEFAULT_SINGLE_LABELS,
    ...props.labels
  };

  const modeOptions = [
    createElement('option', { key: 'simple', value: 'simpleProfile' }, labels.simpleMode),
    createElement('option', { key: 'advanced', value: 'advancedProfile' }, labels.advancedMode)
  ];

  const fields = props.controller.fields.map((field) => {
    const value = toTextValue(props.controller.row[field.id]);
    const error = getFieldError(props.controller.diagnostics.all, 0, field.id);
    const suggestions = collectSuggestions(props.controller.diagnostics.all, 0, field.id);

    const context: SingleAttestFieldRenderContext = {
      field,
      row: props.controller.row,
      value,
      error,
      suggestions,
      onChange: (nextValue: string) => props.controller.setField(field.id, nextValue),
      onApplySuggestion: (suggestion: string) => props.controller.diagnostics.applySuggestion(field.id, suggestion)
    };

    const customField = props.renderField?.(context);
    if (customField !== undefined && customField !== null) {
      return createElement('div', { key: field.id, className: props.classNames?.fieldRow }, customField);
    }

    const suggestionButtons = suggestions.map((suggestion) =>
      createElement(
        'button',
        {
          key: `${field.id}-${suggestion}`,
          type: 'button',
          className: props.classNames?.suggestionButton,
          onClick: () => props.controller.diagnostics.applySuggestion(field.id, suggestion)
        },
        suggestion
      )
    );

    return createElement(
      'div',
      { key: field.id, className: props.classNames?.fieldRow },
      createElement('label', { className: props.classNames?.label }, field.label),
      createElement('input', {
        className: props.classNames?.input,
        value,
        onChange: (event: unknown) => props.controller.setField(field.id, readInputValue(event)),
        'data-field': field.id
      }),
      error ? createElement('div', { className: props.classNames?.fieldError }, error) : null,
      suggestionButtons.length > 0
        ? createElement('div', { className: props.classNames?.suggestionRow }, suggestionButtons)
        : null
    );
  });

  const statusMessage =
    props.controller.submission.error?.message ||
    (props.controller.submission.result
      ? `${props.controller.submission.result.status}${props.controller.submission.result.txHash ? ` (${props.controller.submission.result.txHash})` : ''}`
      : props.controller.validation.error?.message || undefined);

  return createElement(
    'div',
    { className: props.classNames?.root },
    createElement(
      'div',
      { className: props.classNames?.modeRow },
      createElement('label', null, labels.mode),
      createElement(
        'select',
        {
          className: props.classNames?.modeSelect,
          value: props.controller.mode,
          onChange: (event: unknown) => {
            const value = readInputValue(event);
            props.controller.setMode(value === 'advancedProfile' ? 'advancedProfile' : 'simpleProfile');
          }
        },
        modeOptions
      )
    ),
    fields,
    createElement(
      'div',
      { className: props.classNames?.actionsRow },
      createElement(
        'button',
        {
          type: 'button',
          className: props.classNames?.validateButton,
          disabled: props.controller.validation.isRunning,
          onClick: () => {
            void props.controller.validation.run();
          }
        },
        props.controller.validation.isRunning ? labels.validationLoading : labels.validate
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: props.classNames?.submitButton,
          disabled: props.controller.submission.isSubmitting,
          onClick: () => {
            void props.controller.submission.submit(props.walletAdapter);
          }
        },
        props.controller.submission.isSubmitting ? labels.submitLoading : labels.submit
      )
    ),
    statusMessage ? createElement('div', { className: props.classNames?.status }, statusMessage) : null
  );
}

function renderDefaultCell(props: {
  classNames: BulkCsvTableProps['classNames'];
  context: BulkCsvCellRenderContext;
}): unknown {
  const { classNames, context } = props;

  const suggestionButtons = context.suggestions.map((suggestion) =>
    createElement(
      'button',
      {
        key: `${context.rowIndex}-${context.field}-${suggestion}`,
        type: 'button',
        className: classNames?.suggestionButton,
        onClick: () => context.onApplySuggestion(suggestion)
      },
      suggestion
    )
  );

  return createElement(
    'div',
    null,
    createElement('input', {
      className: classNames?.input,
      value: context.value,
      onChange: (event: unknown) => context.onChange(readInputValue(event)),
      'data-field': context.field,
      'data-row': context.rowIndex
    }),
    context.error ? createElement('div', { className: classNames?.cellError }, context.error) : null,
    suggestionButtons.length > 0
      ? createElement('div', { className: classNames?.cellSuggestions }, suggestionButtons)
      : null
  );
}

export function BulkCsvTable(props: BulkCsvTableProps): unknown {
  const labels = {
    ...DEFAULT_BULK_LABELS,
    ...props.labels
  };

  const [csvText, setCsvText] = useState('');

  const rows = props.controller.queue.rows.length > 0 ? props.controller.queue.rows : [{}];
  const columns = props.controller.queue.columns.length > 0 ? props.controller.queue.columns : ['chain_id', 'address'];

  const tableRows = rows.map((row, rowIndex) => {
    const cells = columns.map((field) => {
      const value = toTextValue(row[field]);
      const fieldDiagnostics = props.controller.diagnostics.getField(rowIndex, field);
      const error = props.controller.diagnostics.getFieldError(rowIndex, field)?.message;
      const suggestions = collectSuggestionsFromScopedDiagnostics(fieldDiagnostics);

      const context: BulkCsvCellRenderContext = {
        rowIndex,
        field,
        value,
        error,
        suggestions,
        onChange: (nextValue: string) => props.controller.queue.setCell(rowIndex, field, nextValue),
        onApplySuggestion: (suggestion: string) => props.controller.diagnostics.applySuggestion(rowIndex, field, suggestion)
      };

      const customCell = props.renderCell?.(context);
      const content = customCell !== undefined && customCell !== null
        ? customCell
        : renderDefaultCell({ classNames: props.classNames, context });

      return createElement('td', { key: `${rowIndex}-${field}`, className: props.classNames?.rowCell }, content);
    });

    cells.push(
      createElement(
        'td',
        { key: `${rowIndex}-actions`, className: props.classNames?.rowCell },
        createElement(
          'button',
          {
            type: 'button',
            onClick: () => props.controller.queue.removeRow(rowIndex)
          },
          labels.removeRow
        )
      )
    );

    return createElement('tr', { key: `row-${rowIndex}` }, cells);
  });

  const statusMessage =
    props.controller.submission.error?.message ||
    (props.controller.submission.result
      ? `${props.controller.submission.result.status}${props.controller.submission.result.txHash ? ` (${props.controller.submission.result.txHash})` : ''}`
      : props.controller.validation.error?.message || props.controller.csv.error?.message || undefined);

  return createElement(
    'div',
    { className: props.classNames?.root },
    createElement(
      'div',
      { className: props.classNames?.importRow },
      createElement('textarea', {
        className: props.classNames?.csvInput,
        value: csvText,
        placeholder: labels.csvPlaceholder,
        onChange: (event: unknown) => setCsvText(readInputValue(event))
      }),
      createElement(
        'button',
        {
          type: 'button',
          className: props.classNames?.parseButton,
          disabled: props.controller.csv.isLoading,
          onClick: () => {
            void props.controller.csv.parse(csvText);
          }
        },
        props.controller.csv.isLoading ? labels.validationLoading : labels.parseCsv
      )
    ),
    createElement(
      'div',
      { className: props.classNames?.tableWrapper },
      createElement(
        'table',
        { className: props.classNames?.table },
        createElement(
          'thead',
          null,
          createElement(
            'tr',
            null,
            columns.map((column) => createElement('th', { key: column, className: props.classNames?.headerCell }, column)),
            createElement('th', { key: 'actions', className: props.classNames?.headerCell }, 'Actions')
          )
        ),
        createElement('tbody', null, tableRows)
      )
    ),
    createElement(
      'div',
      { className: props.classNames?.actionsRow },
      createElement(
        'button',
        {
          type: 'button',
          className: props.classNames?.addRowButton,
          disabled: props.controller.queue.rows.length >= 50,
          onClick: () => props.controller.queue.addRow({})
        },
        labels.addRow
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: props.classNames?.validateButton,
          disabled: props.controller.validation.isRunning,
          onClick: () => {
            void props.controller.validation.run();
          }
        },
        props.controller.validation.isRunning ? labels.validationLoading : labels.validate
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: props.classNames?.submitButton,
          disabled: props.controller.submission.isSubmitting,
          onClick: () => {
            void props.controller.submission.submit({ walletAdapter: props.walletAdapter });
          }
        },
        props.controller.submission.isSubmitting ? labels.submitLoading : labels.submit
      )
    ),
    statusMessage ? createElement('div', { className: props.classNames?.status }, statusMessage) : null
  );
}
