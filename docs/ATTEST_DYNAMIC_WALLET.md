---
title: "Dynamic Wallet Integration"
description: "Integrate Dynamic wallets with the OLI attestation write flow."
---

# Dynamic Wallet Integration

## 1. Build the Adapter

```ts
import { createDynamicWalletAdapter } from '@openlabels/oli-sdk/attest';

const walletAdapter = createDynamicWalletAdapter(primaryWallet, {
  paymasterUrl: process.env.NEXT_PUBLIC_COINBASE_PAYMASTER_URL
});
```

The `paymasterUrl` option is optional. See [Environment Variables](ATTEST_ENV.md) for paymaster configuration and the full resolution order.

## 2. Submit a Single Attestation

```ts
import { OLIClient } from '@openlabels/oli-sdk';

const oli = new OLIClient({ api: { apiKey: process.env.OLI_API_KEY! } });
await oli.init();

const prepared = await oli.attest.prepareSingleAttestation(input, {
  mode: 'simpleProfile'
});

const result = await oli.attest.submitSingleOnchain(prepared, walletAdapter);
console.log(result.status, result.txHash, result.sponsored);
```

## 3. Submit a Bulk CSV Attestation

```ts
const parsed = await oli.attest.parseCsv(csvText);
const validated = await oli.attest.validateBulk(parsed.rows, { mode: 'advancedProfile' });

if (validated.valid) {
  const result = await oli.attest.submitBulkOnchain(validated.validRows, walletAdapter);
  console.log(result.uids);
}
```

## Sponsorship Behavior

Coinbase Smart Wallet sponsorship is supported on **Base (chainId 8453)** only.

- The adapter auto-detects sponsorship eligibility by checking the wallet connector name and the active chain.
- If a paymaster URL is configured and the wallet is eligible, the SDK attempts a sponsored transaction first.
- If the sponsored attempt fails — or if no paymaster URL is configured — the SDK automatically falls back to a regular unsponsored transaction. No action is required from your code.
- The result always includes `sponsored: boolean`, so you can inspect which path was taken.

### Paymaster URL resolution order

1. `createDynamicWalletAdapter(wallet, { paymasterUrl })` — explicit argument
2. Submission context `paymasterUrl` passed to `submitSingleOnchain` / `submitBulkOnchain`
3. `OLI_COINBASE_PAYMASTER_URL` env var
4. `NEXT_PUBLIC_COINBASE_PAYMASTER_URL` env var

If no URL is set, the sponsored attempt throws and the SDK automatically falls back to a regular unsponsored transaction.

## Runtime Behavior

- Verifies the wallet is on a supported attestation network before writing.
- Switches the wallet network automatically if needed before submitting.
- Detects sponsorship eligibility (Coinbase Smart Wallet + Base chain).
- Attempts sponsored submission first when eligible and a paymaster URL is available.
- Falls back to a regular unsponsored transaction automatically on sponsored failure or when no paymaster URL is configured.
- Normalizes output to a consistent shape:

```ts
{
  status: 'success' | 'submitted' | 'failed';
  txHash?: string;
  uids: string[];
  sponsored: boolean;
  network: {
    chainId: number;
    name: string;
    explorerUrl: string;
  };
}
```

## Adapter Input Requirements

`primaryWallet` must expose:

- `getWalletClient()` — returns a viem-compatible wallet client
- `switchNetwork(chainId)` — or wallet client chain switching support
- Wallet client contract write capability (`writeContract`)

The adapter wraps these into the `OnchainWalletAdapter` interface. If you are not using Dynamic, you can implement `OnchainWalletAdapter` directly to use any other wallet library.
