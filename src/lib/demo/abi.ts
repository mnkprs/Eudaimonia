import { parseAbi } from "viem";

/**
 * Minimal ABIs for the demo donate path. Kept out of `src/lib/contracts.ts` on
 * purpose: the demo only needs the router's `donate` and two ERC-20 reads.
 */

export const ROUTER_DONATE_ABI = parseAbi([
  "function donate(address endaomentOrg, uint256 amount)",
] as const);

export const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const);
