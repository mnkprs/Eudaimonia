# ADR 0003 — Ship a Public Base Sepolia Demo Instead of a Real-Money Launch

- **Status:** Accepted
- **Date:** 2026-10-01
- **Epic:** [#69 — Epic 8 Public testnet demo](https://github.com/mnkprs/Eudaimonia/issues/69)
- **Supersedes (scope only):** the mainnet go-live steps in `prompts/HUMAN-ACTIONS.md` and the human-only go-live checklist in `prompts/post-epic-actions.md`
- **Depends on:** [ADR 0001 — Stripe Crypto Onramp](./0001-stripe-crypto-onramp.md), [ADR 0002 — Fees on-chain](./0002-fees-on-chain.md)

---

## Context

Eudaimonia is a portfolio project: revenue is not a goal. Its job is to let a reviewer see the core promise — a donation whose every hop can be checked on-chain — working end to end. Closing Epics 3 and 4 as written required a real-money launch, and four facts (verified 2026-10-01) block that path or make it a poor fit:

1. **Endaoment's Base Sepolia entities can't take our test USDC.** The org addresses its dev API returns for our three charities are counterfactual (`isDeployed: false`, no code). Endaoment's Base Sepolia registry uses a non-mintable mock base token ("Endaoment USD", `0xA47D03511d313C4bEfBD2214C78788b8440A0808`), not Circle's test USDC, so even a deployed real entity would reject the router's approval.
2. **The Stripe on-ramp needs an approved application, even for sandbox.** Stripe's docs also list USDC-on-Base as unsupported in the EU.
3. **Taking real donations brings obligations a portfolio project shouldn't carry:** charitable-solicitation registration, a money-transmission analysis, tax-receipt responsibility.
4. **No public deployment existed**, so a reviewer had nothing to open.

## Decision

Ship a **public Base Sepolia demo** as the finished product:

- **Testnet stand-ins for Endaoment.** `EndaomentRegistryStandIn` and `EndaomentOrgStandIn` (`contracts/src/testnet/`) copy Endaoment's `Entity.donate` pull model and its 1.5% fee, accept Circle's Base Sepolia USDC, and refuse to construct on Ethereum or Base mainnet. `script/DeployTestnetDemo.s.sol` deploys them with the unchanged router in one broadcast.
- **A server-side demo wallet donates.** `POST /api/demo/donate` calls `router.donate(org, amount)` — the existing single-tx wallet path, which the receipt pipeline already decodes. The visitor needs no wallet, card or KYC. Amounts are $1, $2 or $5 of test USDC, with a per-IP rate limit, a daily cap and a kill switch.
- **The checkout gains a demo mode.** It's the default on Base Sepolia and can never run on Base mainnet. The Stripe on-ramp mode stays intact.
- **Receipts say what's real.** On Base Sepolia, badges, fee labels, stages and the footer state that the charity contracts are testnet stand-ins, not affiliated with Endaoment, and that no real money moved.
- **Hosted on Vercel** at a public `*.vercel.app` URL.

## What stays as the production design (documented, not operated)

The Stripe on-ramp integration, the `routeHeld` held-settlement path, the mainnet env paths, and the operator runbooks remain in the codebase as the real-money design. The settled-webhook → `routeHeld` relayer with per-session commitments (ADR 0002 amendment, E3.4) remains the next engineering step if a real launch is ever pursued.

## Consequences

- **Positive:** a reviewer can make a donation and inspect real on-chain transactions in about a minute. Nothing of real value is at risk, and no legal or KYC dependency remains.
- **Negative:** the stand-ins aren't Endaoment. The transparency story holds for the router hop (1% fee, allowlist, events) but the charity hop is simulated, and the UI must say so everywhere. Test funds come from faucets in small amounts and must be recycled (stand-in `withdraw`).
- **Guardrails:** mainnet is fenced at four layers. The demo env schema requires `NEXT_PUBLIC_CHAIN=base-sepolia`; the wallet client is pinned to chain 84532; the donation-mode resolver forces the on-ramp on Base mainnet; and the stand-in constructors and deploy script refuse mainnet chain ids.
