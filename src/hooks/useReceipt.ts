'use client';
/**
 * useReceipt — live on-chain receipt hook (Epic 6, Task 5).
 *
 * Returns a discriminated `ReceiptState` that maps to every meaningful step:
 *   loading    → initial fetch in progress
 *   pending    → receipt not yet indexed; bounded backoff polling active
 *   not-found  → receipt still missing after MAX_POLL_ATTEMPTS
 *   wrong-network  → chainId not in ROUTER_SUPPORTED_CHAIN_IDS
 *   wrong-router   → DonationRouted emitted by a foreign contract
 *   unverified → on-chain checks passed structurally but verification failed
 *   ready      → fully decoded + verified ReceiptBundle available
 *
 * Every state carries `prefersReducedMotion: boolean` so the view can disable
 * shimmer animations without a separate hook call. Guarded for SSR
 * (typeof window check).
 *
 * Polling constants (R4 — bounded polling):
 */

import { useEffect, useState } from 'react';
import { isHex } from 'viem';
import type { Hex } from 'viem';
import { baseSepolia } from 'wagmi/chains';

import {
  ROUTER_SUPPORTED_CHAIN_IDS,
  findDonationRouted,
  getRouterAddress,
} from '@/lib/contracts';
import { getPublicClient } from '@/lib/publicClient';
import { getCharityByOrgAddress } from '@/lib/endaoment/registry';
import { ENDAOMENT_ORG_ADDRESSES, type OrgAddressMap } from '@/lib/endaoment/orgs';
import { resolveOrgMetadata } from '@/lib/endaoment/metadata';
import { verifyDonation } from '@/lib/endaoment/verify';
import {
  buildReceiptBundle,
  DecodeReceiptError,
  type BuildReceiptBundleInput,
} from '@/lib/receipt/buildReceiptBundle';
import type { ReceiptBundle } from '@/types/receipt';
import type { VerificationFailureReason } from '@/types/charity';

// ---------------------------------------------------------------------------
// Polling constants (named — no magic numbers)
// ---------------------------------------------------------------------------

/** Maximum number of receipt fetch attempts before giving up (not-found). */
export const MAX_POLL_ATTEMPTS = 12;

/** Initial delay between poll attempts, in milliseconds. */
export const INITIAL_POLL_DELAY_MS = 1_000;

/** Exponential backoff multiplier applied to each successive delay. */
export const POLL_BACKOFF_MULTIPLIER = 1.5;

/** Ceiling for the computed backoff delay, in milliseconds. */
export const MAX_POLL_DELAY_MS = 30_000;

/**
 * Minimum on-chain confirmation count required before building the bundle.
 * Base L2 finalises quickly; 1 block gives sufficient safety for display.
 */
export const CONFIRMATIONS_THRESHOLD = 1n;

// ---------------------------------------------------------------------------
// State union
// ---------------------------------------------------------------------------

/** Base fields present on every state variant. */
interface StateBase {
  /** Honour the OS prefers-reduced-motion setting to disable shimmer. */
  prefersReducedMotion: boolean;
}

export type ReceiptState =
  | ({ status: 'loading' } & StateBase)
  | ({ status: 'pending'; attempts: number } & StateBase)
  | ({ status: 'not-found' } & StateBase)
  | ({ status: 'wrong-network' } & StateBase)
  | ({ status: 'wrong-router' } & StateBase)
  | ({ status: 'unverified'; reason: VerificationFailureReason } & StateBase)
  | ({ status: 'ready'; bundle: ReceiptBundle } & StateBase);

/**
 * Alias used by tests to import the discriminated union type.
 */
export type ResolverState = ReceiptState;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read prefers-reduced-motion, guarded for SSR. */
function readPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}


// ---------------------------------------------------------------------------
// Core resolver (pure async state machine — testable without React)
// ---------------------------------------------------------------------------

export interface ResolverOptions {
  /** Raw transaction id. Validated as hex inside the resolver. */
  txid: string;
  /** Active chain ID. When omitted defaults to Base Sepolia. */
  chainId?: number;
  /** Called each time the state transitions. */
  onState: (state: ReceiptState) => void;
  /** Caller-owned AbortSignal; resolver stops when aborted. */
  signal: AbortSignal;
  /** Org-address map used to attribute the routed org to a charity. Defaults to production. */
  orgAddressMap?: OrgAddressMap;
}

/**
 * Drives the receipt loading state machine.
 *
 * Exported so tests can exercise it directly without mounting a React component.
 * The `useReceipt` hook wraps this with `useEffect` + `AbortController`.
 */
export async function runReceiptResolver(options: ResolverOptions): Promise<void> {
  const {
    txid: rawTxid,
    chainId = baseSepolia.id,
    onState,
    signal,
    orgAddressMap = ENDAOMENT_ORG_ADDRESSES,
  } = options;

  const prefersReducedMotion = readPrefersReducedMotion();

  /** Emit a state update, checking the abort signal first. */
  const emit = (state: ReceiptState): void => {
    if (signal.aborted) return;
    onState(state);
  };

  // --- Pre-check: txid must be a valid hex string ---
  if (!isHex(rawTxid)) {
    emit({ status: 'not-found', prefersReducedMotion });
    return;
  }
  const txid: Hex = rawTxid;

  // --- Pre-check: supported network ---
  if (!(ROUTER_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId)) {
    emit({ status: 'wrong-network', prefersReducedMotion });
    return;
  }

  emit({ status: 'loading', prefersReducedMotion });

  const client = getPublicClient(chainId);

  let attempts = 0;
  let delayMs = INITIAL_POLL_DELAY_MS;

  // --- Polling loop ---
  while (attempts < MAX_POLL_ATTEMPTS) {
    if (signal.aborted) return;

    attempts += 1;

    // Attempt to fetch the receipt
    let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>;
    try {
      receipt = await client.getTransactionReceipt({ hash: txid });
    } catch {
      // Receipt not indexed yet — enter or stay in pending
      if (signal.aborted) return;

      if (attempts >= MAX_POLL_ATTEMPTS) {
        emit({ status: 'not-found', prefersReducedMotion });
        return;
      }

      emit({ status: 'pending', attempts, prefersReducedMotion });

      // Bounded backoff delay
      await new Promise<void>((resolve) => {
        const id = setTimeout(resolve, delayMs);
        signal.addEventListener('abort', () => {
          clearTimeout(id);
          resolve();
        }, { once: true });
      });

      delayMs = Math.min(delayMs * POLL_BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
      continue;
    }

    // Receipt obtained — check confirmations
    let confirmations: bigint;
    try {
      confirmations = await client.getTransactionConfirmations({ hash: txid });
    } catch {
      // Transient RPC failure — treat as pending
      if (signal.aborted) return;

      if (attempts >= MAX_POLL_ATTEMPTS) {
        emit({ status: 'not-found', prefersReducedMotion });
        return;
      }

      emit({ status: 'pending', attempts, prefersReducedMotion });

      await new Promise<void>((resolve) => {
        const id = setTimeout(resolve, delayMs);
        signal.addEventListener('abort', () => {
          clearTimeout(id);
          resolve();
        }, { once: true });
      });

      delayMs = Math.min(delayMs * POLL_BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
      continue;
    }

    if (signal.aborted) return;

    // Still awaiting confirmations
    if (confirmations < CONFIRMATIONS_THRESHOLD) {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        emit({ status: 'not-found', prefersReducedMotion });
        return;
      }

      emit({ status: 'pending', attempts, prefersReducedMotion });

      await new Promise<void>((resolve) => {
        const id = setTimeout(resolve, delayMs);
        signal.addEventListener('abort', () => {
          clearTimeout(id);
          resolve();
        }, { once: true });
      });

      delayMs = Math.min(delayMs * POLL_BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
      continue;
    }

    // Receipt confirmed — resolve charity, verify, and build bundle
    if (signal.aborted) return;

    // --- Resolve block data ---
    let block: { number: bigint; timestamp: bigint };
    try {
      block = await client.getBlock({ blockNumber: receipt.blockNumber });
    } catch {
      // Block read failure is non-retryable here; surface as unverified
      emit({
        status: 'unverified',
        reason: 'no-routed-log',
        prefersReducedMotion,
      });
      return;
    }

    if (signal.aborted) return;

    // --- Resolve charity from the on-chain DonationRouted org ---
    // The donated-to org is whatever the router emitted, not a guess: map it
    // back to its campaign. Unknown org means we cannot attribute the donation.
    let routed: ReturnType<typeof findDonationRouted>;
    try {
      routed = findDonationRouted(receipt.logs);
    } catch {
      emit({ status: 'unverified', reason: 'no-routed-log', prefersReducedMotion });
      return;
    }
    if (!routed) {
      emit({ status: 'unverified', reason: 'no-routed-log', prefersReducedMotion });
      return;
    }

    const charityForVerify = getCharityByOrgAddress(routed.org, chainId, orgAddressMap);
    if (!charityForVerify) {
      emit({ status: 'unverified', reason: 'org-mismatch', prefersReducedMotion });
      return;
    }

    // --- Verify donation ---
    let verifyResult: Awaited<ReturnType<typeof verifyDonation>>;
    try {
      verifyResult = await verifyDonation(txid, charityForVerify, chainId);
    } catch {
      emit({
        status: 'unverified',
        reason: 'no-routed-log',
        prefersReducedMotion,
      });
      return;
    }

    if (signal.aborted) return;

    if (!verifyResult.verified) {
      if (verifyResult.reason === 'wrong-router') {
        emit({ status: 'wrong-router', prefersReducedMotion });
      } else {
        emit({
          status: 'unverified',
          reason: verifyResult.reason,
          prefersReducedMotion,
        });
      }
      return;
    }

    // --- Resolve metadata ---
    let orgMetadata: Awaited<ReturnType<typeof resolveOrgMetadata>>;
    try {
      orgMetadata = await resolveOrgMetadata(charityForVerify.ein);
    } catch {
      emit({
        status: 'unverified',
        reason: 'no-org-address-for-chain',
        prefersReducedMotion,
      });
      return;
    }

    if (signal.aborted) return;

    // --- Build bundle ---
    const routerAddress = getRouterAddress(chainId);

    const bundleInput: BuildReceiptBundleInput = {
      receipt,
      routerAddress: routerAddress ?? ('0x0000000000000000000000000000000000000000' as const),
      orgAddress: verifyResult.org,
      chainId,
      txid,
      charity: charityForVerify,
      orgMetadata,
      block,
      confirmations,
    };

    let bundle: ReceiptBundle;
    try {
      bundle = buildReceiptBundle(bundleInput);
    } catch (err: unknown) {
      if (err instanceof DecodeReceiptError) {
        if (err.reason === 'wrong-router') {
          emit({ status: 'wrong-router', prefersReducedMotion });
        } else {
          emit({
            status: 'unverified',
            reason: 'missing-transfer',
            prefersReducedMotion,
          });
        }
        return;
      }
      emit({
        status: 'unverified',
        reason: 'no-routed-log',
        prefersReducedMotion,
      });
      return;
    }

    if (signal.aborted) return;

    emit({ status: 'ready', bundle, prefersReducedMotion });
    return;
  }

  // Exhausted attempts without a confirmed receipt
  if (!signal.aborted) {
    emit({ status: 'not-found', prefersReducedMotion });
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * `useReceipt(txid, chainId?)` — client-side receipt loading hook.
 *
 * Starts in `loading`, polls with bounded backoff when the receipt is not yet
 * indexed, and resolves to one of the terminal states when done.
 * Cancels in-flight operations automatically on unmount or dep change.
 */
export function useReceipt(txid: string, chainId?: number): ReceiptState {
  const activeChainId = chainId ?? baseSepolia.id;
  const prefersReducedMotion = readPrefersReducedMotion();

  const [state, setState] = useState<ReceiptState>({
    status: 'loading',
    prefersReducedMotion,
  });

  useEffect(() => {
    const controller = new AbortController();

    runReceiptResolver({
      txid,
      chainId: activeChainId,
      onState: (s) => {
        if (!controller.signal.aborted) {
          setState(s);
        }
      },
      signal: controller.signal,
    }).catch(() => {
      if (!controller.signal.aborted) {
        setState({ status: 'not-found', prefersReducedMotion });
      }
    });

    return () => {
      controller.abort();
    };
  }, [txid, activeChainId, prefersReducedMotion]);

  return state;
}
