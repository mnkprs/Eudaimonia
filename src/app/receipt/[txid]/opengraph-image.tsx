/**
 * Open Graph image route for `/receipt/[txid]` (Epic 6, Task 8).
 *
 * Next.js auto-wires this file as the `og:image` for the receipt page.
 * Returns a 1200×630 PNG card with the charity name, USDC amount, and a
 * "Verified" mark. Falls back to a generic Eudaimonia card when the receipt
 * cannot be decoded server-side.
 *
 * Runs in the Node runtime (not edge) — no `export const runtime = "edge"`.
 */

import { ImageResponse } from "next/og";

import { resolveAppChainId } from "@/lib/chain";
import { loadReceiptForMetadata } from "@/lib/receipt/loadReceiptForMetadata";

// ---------------------------------------------------------------------------
// Route metadata consumed by Next.js
// ---------------------------------------------------------------------------

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OgImageProps {
  params: Promise<{ txid: string }>;
}

// ---------------------------------------------------------------------------
// Default export — the image handler
// ---------------------------------------------------------------------------

/**
 * Generates the OG card for a donation receipt.
 *
 * Resolved:  charity name + formatted USDC amount + "Verified" badge.
 * Fallback:  generic "Eudaimonia" card (tx not found, decode failure, etc.).
 */
export default async function OgImage({ params }: OgImageProps): Promise<ImageResponse> {
  const { txid } = await params;

  const chainId = resolveAppChainId();

  let receipt: Awaited<ReturnType<typeof loadReceiptForMetadata>> = null;
  try {
    receipt = await loadReceiptForMetadata(txid as `0x${string}`, chainId);
  } catch {
    // Any error → fall through to the generic card below
  }

  if (receipt) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            backgroundColor: "#0d1117",
            padding: "60px 72px",
            fontFamily: "sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: 20,
                color: "#8b949e",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Eudaimonia
            </span>
            <span
              style={{
                fontSize: 14,
                color: "#3fb950",
                backgroundColor: "#1a3a2a",
                padding: "2px 10px",
                borderRadius: 9999,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              Verified
            </span>
          </div>

          {/* Charity name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#f0f6fc",
                lineHeight: 1.15,
                maxWidth: 900,
              }}
            >
              {receipt.charityName}
            </div>

            {/* Amount */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: "#58a6ff",
                }}
              >
                {receipt.amountUsdc} USDC
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: "#8b949e",
                }}
              >
                donated on-chain
              </span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: 16,
              color: "#484f58",
            }}
          >
            Transparent routing via Endaoment · Base
          </div>
        </div>
      ),
      { ...size },
    );
  }

  // Fallback generic card
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0d1117",
          padding: "60px 72px",
          fontFamily: "sans-serif",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#f0f6fc",
          }}
        >
          Eudaimonia
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#8b949e",
          }}
        >
          Donation receipt
        </div>
      </div>
    ),
    { ...size },
  );
}
