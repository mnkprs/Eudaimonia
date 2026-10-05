/**
 * Which checkout flow the app runs. Mainnet can never run the demo: the
 * `base` chain is hard-wired to the real on-ramp regardless of other config.
 */

export type DonationMode = "demo" | "onramp";

interface DonationModeEnv {
  readonly NEXT_PUBLIC_CHAIN?: string;
  readonly NEXT_PUBLIC_DONATION_MODE?: string;
}

/**
 * Default reads use static `process.env.NEXT_PUBLIC_*` property access so
 * Next.js can inline the values into client bundles.
 */
function readProcessEnv(): DonationModeEnv {
  return {
    NEXT_PUBLIC_CHAIN: process.env.NEXT_PUBLIC_CHAIN,
    NEXT_PUBLIC_DONATION_MODE: process.env.NEXT_PUBLIC_DONATION_MODE,
  };
}

export function resolveDonationMode(
  env: DonationModeEnv = readProcessEnv(),
): DonationMode {
  if (env.NEXT_PUBLIC_CHAIN === "base") return "onramp";
  if (env.NEXT_PUBLIC_DONATION_MODE === "onramp") return "onramp";
  return "demo";
}
