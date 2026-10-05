# Eudaimonia

A transparent, consumer-facing donation platform built on Base L2. Donors pay with a credit card; the money is converted to USDC on-chain, routed through an auditable smart contract, and delivered to vetted charities via [Endaoment](https://endaoment.org)'s decentralized philanthropy infrastructure. Every gift produces a public, verifiable receipt that traces the money from donor to charity — settlement, fees, and final delivery rendered as a shareable story.

> **Live demo:** **https://eudaimonia-nine.vercel.app** — a public Base Sepolia testnet demo. Pick a cause, send a $1–$5 *test* donation (no wallet, no card, no real money) and land on a live receipt with real transaction links. [Details below](#try-the-demo).

The name comes from the Greek *εὐδαιμονία* (eudaimonia): human flourishing, the good life. The repository is named for a second Greek word, *φιλότιμο* (philotimo) — the sense of duty to do right by others.

## How it works

```mermaid
flowchart LR
    donor([Donor]) -- "fiat, by card" --> onramp["Stripe Crypto Onramp"]
    onramp -- "USDC on Base" --> router["TransparentDonationRouter"]
    router -- "1% fee" --> treasury["Treasury"]
    router -- "99%" --> org["Endaoment org Entity"]
    org --> charity([Charity])
```

1. **Select** — the donor picks a curated, urgent cause on the landing page.
2. **Pay** — they enter an amount at `/donate/[campaignId]` and pay by card or Apple Pay. No wallet, no crypto knowledge required.
3. **On-ramp** — Stripe Crypto Onramp mints the fiat as USDC on Base; `/processing/[sessionId]` tracks the session as webhooks advance it toward settlement.
4. **Route** — Stripe settles the USDC into the `TransparentDonationRouter` with a plain transfer; the operator's `routeHeld` call then skims the hardcoded 1% platform fee to the treasury and forwards the remaining 99% to the target charity's Endaoment org Entity in one transaction. Wallet donors call `donate` and get the same split in a single tx. (Automating the settled-webhook → `routeHeld` step is the open follow-up E3.4.)
5. **Prove** — `/receipt/[txid]` decodes the on-chain `DonationRouted` event into a visual timeline with real transaction IDs, linked to the block explorer.

## Try the demo

The production design above needs a live Stripe on-ramp and real Endaoment entities. Neither fits a portfolio project, so the live site is a **Base Sepolia testnet demo** ([ADR 0003](docs/adr/0003-testnet-demo.md)):

1. Open **https://eudaimonia-nine.vercel.app** and choose a cause.
2. Pick $1, $2 or $5 and press **Send test donation**. A server-side demo wallet calls `router.donate()` with Circle's test USDC — you need no wallet.
3. You land on `/receipt/<tx>` within seconds: the 1% / 1.5% / remainder split, decoded from the on-chain event, with links to Basescan.

Or open a finished receipt directly: [PCRF](https://eudaimonia-nine.vercel.app/receipt/0x31335acb9328ae3136adb552943a07844c806165aaa43b547628986433c3cd9e) · [World Central Kitchen](https://eudaimonia-nine.vercel.app/receipt/0x4f2f6f693b295da40bb971f26dbe08e83b765de22f1377bf6bccdd54293ed849) · [Direct Relief](https://eudaimonia-nine.vercel.app/receipt/0xc5388d494291b06cb7e51b5c1828aa5212e8199e0d02231ae217d44a548e49e1).

**What's real and what's a stand-in:**

| Part | In the demo |
|---|---|
| Router contract (`TransparentDonationRouter`) | Real — the same code as production, deployed and source-verified on Base Sepolia |
| 1% platform fee, allowlist, events | Real, enforced on-chain |
| USDC | Circle's Base Sepolia **test** USDC — no monetary value |
| Charity contracts | **Testnet stand-ins**, not Endaoment. Endaoment's Base Sepolia deployment uses a non-mintable mock token, so its entities can't receive test USDC. The stand-ins copy Endaoment's `donate` pull model and its 1.5% fee, and refuse to deploy on mainnet. |
| Card payment / Stripe on-ramp | Not used in the demo; the code ships as the production design |

| Base Sepolia contract | Address |
|---|---|
| `TransparentDonationRouter` | [`0x88964c6141D927dB05ddFA995a6ffA4BbD1beB91`](https://base-sepolia.blockscout.com/address/0x88964c6141D927dB05ddFA995a6ffA4BbD1beB91) |
| Stand-in: Palestine Children's Relief Fund | [`0xa27cBA0B1B617dAED0De4686eD029f7B5ECd4720`](https://base-sepolia.blockscout.com/address/0xa27cBA0B1B617dAED0De4686eD029f7B5ECd4720) |
| Stand-in: World Central Kitchen | [`0x43812bc126067fd9446901418721Bc9bbB239674`](https://base-sepolia.blockscout.com/address/0x43812bc126067fd9446901418721Bc9bbB239674) |
| Stand-in: Direct Relief | [`0xa591AFCc7F33aCdC62d323064Bf7Dd9f6bADB305`](https://base-sepolia.blockscout.com/address/0xa591AFCc7F33aCdC62d323064Bf7Dd9f6bADB305) |

Full deployment record: [`contracts/deployments/base-sepolia.json`](contracts/deployments/base-sepolia.json). Test funds are limited (faucets drip 20 USDC per 2 h), so the demo has a per-IP rate limit and a daily cap; if the demo wallet is empty, the sample receipts above still work.

## Trust model

The routing contract ([`contracts/src/TransparentDonationRouter.sol`](contracts/src/TransparentDonationRouter.sol)) is deliberately small and rigid:

- **Fee is hardcoded** — `FEE_BPS = 100` (1%) is a compile-time constant. No owner can raise it.
- **USDC and treasury are immutable** — set once at deploy, validated against the zero address, unchangeable afterward.
- **Destinations are allowlisted** — `donate` only forwards to org addresses the owner has vetted as legitimate Endaoment entities, so a valid `DonationRouted` log can never point at an attacker-controlled address. The owner key must be a multisig in production.
- **Checks-effects-interactions + `ReentrancyGuard`** on the donation path, with OpenZeppelin `SafeERC20` for transfers.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Web3 reads | viem + wagmi (receipt decoding, contract event reads) |
| Payments | Stripe Crypto Onramp (fiat → USDC on Base) |
| State/session | Vercel KV (Upstash Redis) with an in-memory fallback for dev |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| Network | Base mainnet / Base Sepolia (never Ethereum L1) |
| Observability | Sentry, Pino, Vercel Analytics |

## Repository layout

```
src/                  Next.js app
  app/                Routes: landing, donate/[campaignId], processing/[sessionId],
                      receipt/[txid], fee-policy, api/onramp (webhook + sessions)
  components/         UI components (shadcn/ui-based, Stripe-style design system)
  lib/                Domain logic: onramp state machine, receipt decoding,
                      campaigns, KV stores, rate limiting, env validation
contracts/            Foundry project
  src/                TransparentDonationRouter.sol + interfaces
  test/               Unit + fuzz tests, Base mainnet fork tests (test/fork/)
  script/             Deploy.s.sol (unit-tested deploy script)
docs/                 RUNBOOK.md (ops), DEPLOY-VERCEL.md, ADRs
prompts/              Persisted epic plans and operator action logs
e2e/                  Playwright end-to-end tests
```

Key documents: [`PRODUCT.md`](PRODUCT.md) (PRD), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DESIGN.md`](DESIGN.md) (design system), [`SECURITY.md`](SECURITY.md), [`docs/RUNBOOK.md`](docs/RUNBOOK.md) (webhook + router triage), [`contracts/DEPLOY.md`](contracts/DEPLOY.md) (router deployment).

## Getting started

Prerequisites: Node.js 20+, npm, and [Foundry](https://getfoundry.sh) (for contract work).

```bash
git clone https://github.com/mnkprs/Philotimo.git
cd Philotimo
npm ci

# Configure environment
cp .env.local.example .env.local
# Fill in Stripe keys, KV credentials, RPC URLs, and contract addresses.
# Defaults target Base Sepolia; public RPC endpoints work for development.

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Contracts

Foundry dependencies are vendored into `contracts/lib/` (not committed):

```bash
cd contracts
git clone --depth 1 --branch v1.9.6 https://github.com/foundry-rs/forge-std lib/forge-std
git clone --depth 1 --branch v5.1.0 https://github.com/OpenZeppelin/openzeppelin-contracts lib/openzeppelin-contracts
forge build
forge test
```

Fork tests in `contracts/test/fork/` run against a real Base mainnet fork and self-skip when `BASE_RPC_URL` / `ENDAOMENT_ORG` are not set, so the suite stays green without secrets:

```bash
BASE_RPC_URL=<your-base-rpc> ENDAOMENT_ORG=<org-entity-address> forge test --match-path 'test/fork/*'
```

Deployment to Base Sepolia or mainnet is an operator action — see [`contracts/DEPLOY.md`](contracts/DEPLOY.md).

## Testing

The project is developed test-first (TDD) with an 80% coverage floor.

```bash
npm test                    # Vitest unit/component suite
npm run test:coverage       # with V8 coverage
npm run test:e2e            # Playwright E2E (npm run test:e2e:install first)
npm run test:a11y:lighthouse # Lighthouse CI accessibility audit
npx tsc --noEmit            # type-check
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs two independent jobs on every PR: the frontend pipeline (lint, type-check, unit tests, production build) and the contracts pipeline (`forge build` + `forge test`).

## Status

Portfolio project, built in planned epics (see `prompts/epic-*.md`): landing page, checkout, fiat on-ramp, the router contract, Endaoment integration, the receipt page, production hardening, and the public testnet demo (Epic 8). A real-money launch (mainnet deploy, multisig owner, Stripe live approval, legal review) is deliberately out of scope — see [ADR 0003](docs/adr/0003-testnet-demo.md). Not accepting external contributions.
