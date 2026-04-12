import { useCallback, useMemo, useState } from 'react';
import type {
  AttestationRowInput,
  BulkOnchainSubmitResult,
  BulkValidationResult,
  CsvParseResult,
  OnchainWalletAdapter,
  ParseCsvOptions,
  PrepareSingleOptions,
  PreparedAttestation,
  SingleValidationResult,
  ValidationOptions
} from '../types';
import type { AttestClient } from '../api';

interface AsyncState<T> {
  loading: boolean;
  error: Error | null;
  result: T | null;
}

function useAsyncState<T>() {
  return useState<AsyncState<T>>({
    loading: false,
    error: null,
    result: null
  });
}

export function useSingleAttest(attest: AttestClient) {
  const [validationState, setValidationState] = useAsyncState<SingleValidationResult>();
  const [submissionState, setSubmissionState] = useAsyncState<import('../types').OnchainSubmitResult>();

  const validate = useCallback(
    async (input: AttestationRowInput, options: ValidationOptions = {}) => {
      setValidationState({ loading: true, error: null, result: null });
      try {
        const result = await attest.validateSingle(input, options);
        setValidationState({ loading: false, error: null, result });
        return result;
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setValidationState({ loading: false, error: normalizedError, result: null });
        throw normalizedError;
      }
    },
    [attest, setValidationState]
  );

  const prepare = useCallback(
    async (input: AttestationRowInput, options: PrepareSingleOptions = {}) => {
      return attest.prepareSingleAttestation(input, options);
    },
    [attest]
  );

  const submitPrepared = useCallback(
    async (prepared: PreparedAttestation, walletAdapter: OnchainWalletAdapter) => {
      setSubmissionState({ loading: true, error: null, result: null });
      try {
        const result = await attest.submitSingleOnchain(prepared, walletAdapter);
        setSubmissionState({ loading: false, error: null, result });
        return result;
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setSubmissionState({ loading: false, error: normalizedError, result: null });
        throw normalizedError;
      }
    },
    [attest, setSubmissionState]
  );

  const prepareAndSubmit = useCallback(
    async (input: AttestationRowInput, walletAdapter: OnchainWalletAdapter, options: PrepareSingleOptions = {}) => {
      const prepared = await attest.prepareSingleAttestation(input, options);
      return submitPrepared(prepared, walletAdapter);
    },
    [attest, submitPrepared]
  );

  return useMemo(
    () => ({
      validate,
      prepare,
      submitPrepared,
      prepareAndSubmit,
      validation: validationState,
      submission: submissionState
    }),
    [validate, prepare, submitPrepared, prepareAndSubmit, validationState, submissionState]
  );
}

export function useBulkCsvAttest(attest: AttestClient) {
  const [csvState, setCsvState] = useAsyncState<CsvParseResult>();
  const [validationState, setValidationState] = useAsyncState<BulkValidationResult>();
  const [submissionState, setSubmissionState] = useAsyncState<BulkOnchainSubmitResult>();

  const parseCsv = useCallback(
    async (csvText: string, options: ParseCsvOptions = {}) => {
      setCsvState({ loading: true, error: null, result: null });
      try {
        const result = await attest.parseCsv(csvText, options);
        setCsvState({ loading: false, error: null, result });
        return result;
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setCsvState({ loading: false, error: normalizedError, result: null });
        throw normalizedError;
      }
    },
    [attest, setCsvState]
  );

  const validate = useCallback(
    async (rows: AttestationRowInput[], options: ValidationOptions = {}) => {
      setValidationState({ loading: true, error: null, result: null });
      try {
        const result = await attest.validateBulk(rows, options);
        setValidationState({ loading: false, error: null, result });
        return result;
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setValidationState({ loading: false, error: normalizedError, result: null });
        throw normalizedError;
      }
    },
    [attest, setValidationState]
  );

  const applySuggestion = useCallback(
    (row: AttestationRowInput, field: string, suggestion: string) => attest.applySuggestion(row, field, suggestion),
    [attest]
  );

  const submit = useCallback(
    async (rows: AttestationRowInput[] | PreparedAttestation[], walletAdapter: OnchainWalletAdapter) => {
      setSubmissionState({ loading: true, error: null, result: null });
      try {
        const result = await attest.submitBulkOnchain(rows, walletAdapter);
        setSubmissionState({ loading: false, error: null, result });
        return result;
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setSubmissionState({ loading: false, error: normalizedError, result: null });
        throw normalizedError;
      }
    },
    [attest, setSubmissionState]
  );

  return useMemo(
    () => ({
      parseCsv,
      validate,
      applySuggestion,
      submit,
      csv: csvState,
      validation: validationState,
      submission: submissionState
    }),
    [parseCsv, validate, applySuggestion, submit, csvState, validationState, submissionState]
  );
}
