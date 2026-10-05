import { base, baseSepolia } from "wagmi/chains";

/**
 * Resolves the chain the app targets from `NEXT_PUBLIC_CHAIN`.
 *
 * `"base"` selects Base mainnet; anything else (unset, empty, `"base-sepolia"`,
 * unrecognised) selects Base Sepolia so a misconfigured deploy never silently
 * reads mainnet.
 *
 * Call this from server code (route handlers, server components) and pass the
 * result down as a prop: `env` defaults to `process.env`, which Next.js does
 * not inline into client bundles.
 */
export function resolveAppChainId(
  env: Readonly<Record<string, string | undefined>> = process.env,
): number {
  return env.NEXT_PUBLIC_CHAIN === "base" ? base.id : baseSepolia.id;
}

/**
 * True when a receipt's network label is the Base Sepolia testnet, where the
 * charity contracts are stand-ins and receipt copy must say so.
 */
export function isTestnetNetwork(network: string): boolean {
  return network === "Base Sepolia";
}
