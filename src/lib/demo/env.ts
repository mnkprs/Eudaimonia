import type { Address, Hex } from "viem";
import { z } from "zod";

/**
 * Demo-only environment schema, independent of `src/lib/env/server.ts` so the
 * public testnet demo needs no Stripe or KV configuration.
 *
 * Validation failures never include the offending VALUE: Zod issue messages
 * here are static strings, and `DemoEnvError` only carries `path: message`.
 */

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const PRIVATE_KEY = /^0x[a-fA-F0-9]{64}$/;

/** Circle's Base Sepolia test USDC. */
const DEFAULT_USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const DEFAULT_RPC_URL = "https://sepolia.base.org";
const DEFAULT_DAILY_CAP = 25;

/**
 * Minimum ETH the demo wallet must hold to send one donation. A Base Sepolia
 * `donate` costs roughly 100-200k gas at ~0.001-0.01 gwei, i.e. well under
 * 0.000002 ETH; 0.00002 ETH (2e13 wei) leaves ~10x headroom for gas spikes
 * while still failing fast, with a friendly error, before the node does.
 */
const DEFAULT_MIN_ETH_WEI = "20000000000000";

export const demoEnvSchema = z
  .object({
    NEXT_PUBLIC_CHAIN: z.literal("base-sepolia", {
      error: "NEXT_PUBLIC_CHAIN must be exactly base-sepolia for the demo",
    }),
    DEMO_DONATIONS_ENABLED: z.literal("true", {
      error: "DEMO_DONATIONS_ENABLED must be exactly true",
    }),
    DEMO_WALLET_PRIVATE_KEY: z
      .string({ error: "DEMO_WALLET_PRIVATE_KEY is required" })
      .regex(
        PRIVATE_KEY,
        "DEMO_WALLET_PRIVATE_KEY must be 0x followed by 64 hex characters",
      )
      .transform((value) => value as Hex),
    DEMO_DAILY_CAP: z.coerce
      .number({ error: "DEMO_DAILY_CAP must be a number" })
      .int("DEMO_DAILY_CAP must be an integer")
      .positive("DEMO_DAILY_CAP must be positive")
      .default(DEFAULT_DAILY_CAP),
    DEMO_MIN_ETH_WEI: z
      .string()
      .regex(/^\d+$/, "DEMO_MIN_ETH_WEI must be a non-negative integer string")
      .default(DEFAULT_MIN_ETH_WEI)
      .transform((value) => BigInt(value)),
    USDC_CONTRACT_BASE_SEPOLIA: z
      .string()
      .regex(
        EVM_ADDRESS,
        "USDC_CONTRACT_BASE_SEPOLIA must match 0x[a-fA-F0-9]{40}",
      )
      .default(DEFAULT_USDC_BASE_SEPOLIA)
      .transform((value) => value as Address),
    BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
  })
  .transform((env) => ({
    ...env,
    rpcUrl:
      env.BASE_SEPOLIA_RPC_URL ??
      env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ??
      DEFAULT_RPC_URL,
  }));

export type DemoEnv = z.infer<typeof demoEnvSchema>;

export class DemoEnvError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid demo env:\n  - ${issues.join("\n  - ")}`);
    this.name = "DemoEnvError";
  }
}

export function loadDemoEnv(source: Record<string, unknown>): DemoEnv {
  const result = demoEnvSchema.safeParse(source);
  if (result.success) return result.data;

  throw new DemoEnvError(
    result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    ),
  );
}

let cached: DemoEnv | null = null;

/** Memoised accessor over `process.env`; tests use `loadDemoEnv` directly. */
export function demoEnv(): DemoEnv {
  if (cached === null) {
    cached = loadDemoEnv(process.env);
  }
  return cached;
}
