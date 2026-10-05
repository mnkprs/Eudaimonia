'use client';

import { useReceipt } from "@/hooks/useReceipt";
import { ErrorCard } from "@/components/receipt/ErrorCard";
import { EudaimoniaReceipt } from "@/components/receipt/EudaimoniaReceipt";
import { ReceiptSkeleton } from "@/components/receipt/ReceiptSkeleton";
import { deriveTxUrl } from "@/lib/explorer";
import type { Hex } from "@/types/receipt";

interface ReceiptViewProps {
  /** Full transaction hash from the route param. */
  txid: string;
  /**
   * Optional chain id to pass to the hook. When omitted the hook defaults to
   * Base Sepolia (matches `useReceipt` default behaviour).
   */
  chainId?: number;
}

/**
 * Client component that drives the receipt page rendering.
 *
 * Maps every `useReceipt` state to the appropriate UI:
 *   loading / pending  → ReceiptSkeleton (shimmer, no spinner)
 *   ready              → EudaimoniaReceipt (full receipt UI)
 *   not-found          → ErrorCard kind="not-found"
 *   wrong-network      → ErrorCard kind="wrong-network"
 *   wrong-router       → ErrorCard kind="wrong-router"
 *   unverified         → ErrorCard kind="unverified"
 */
export function ReceiptView({ txid, chainId }: ReceiptViewProps) {
  const state = useReceipt(txid, chainId);

  if (state.status === "loading" || state.status === "pending") {
    return <ReceiptSkeleton />;
  }

  if (state.status === "ready") {
    return <EudaimoniaReceipt bundle={state.bundle} chainId={chainId} />;
  }

  // All error states — derive baseScanUrl for the fallback link.
  // deriveTxUrl requires a Hex txid; if the txid is malformed it still
  // produces a URL (the link may 404 on BaseScan, but no crash).
  const baseScanUrl = deriveTxUrl(txid as Hex, chainId ?? 84532);

  return <ErrorCard kind={state.status} baseScanUrl={baseScanUrl} />;
}
