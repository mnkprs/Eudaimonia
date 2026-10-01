# Epic 8 — Public Testnet Demo — TDD Plan

> **GitHub issue:** [#69 — Epic 8 — Public testnet demo](https://github.com/mnkprs/Eudaimonia/issues/69)
> **Status (2026-10-01):** IN PROGRESS — Phase 0 done (branch + issue + plan). Testnet keystores created locally (`~/.foundry/keystores/eudaimonia-{deployer,treasury,demo}`, passwords in `~/.foundry/pw/`, chmod 600): deployer `0x67Ff1580b257be4dd8C078D8a4330be4464543B8`, treasury `0xEFDc4E245a88e68226319E90ccA490E4c3A4adad`, demo wallet `0x40436fc2573527F7B25cAB98e9d2D560a77d7A76`. Waiting on the owner to fund the deployer from faucets (Phase 2). Resume at **Phase 1** (stand-in contracts, TDD).
> **Branch:** `epic-8-testnet-demo` (off `main` @ `524e723`)
> **Depends on:** Epic 4 router (unchanged), Epic 5/6 receipt pipeline.

## Context

Eudaimonia is a **portfolio project** (owner confirmed 2026-10-01: revenue doesn't matter). The open epics #4 (on-ramp) and #5 (router) were aiming at a real-money launch, which turned out to be blocked several ways:

- Endaoment's Base Sepolia org addresses in `src/lib/endaoment/orgs.ts` have **no contract code** (counterfactual, `isDeployed:false`), and Endaoment's Base Sepolia deployment uses a **non-mintable mock token** ("Endaoment USD" `0xA47D…0808`), not Circle USDC. Real Endaoment entities on Base Sepolia can't receive our test USDC, so every router `donate()` there would revert.
- Stripe's on-ramp needs an approved application even for sandbox; the local `STRIPE_SECRET_KEY` is a placeholder; Stripe's docs list USDC-on-Base as unsupported in the EU.
- The receipt page has bugs a demo would hit: it always verifies against PCRF (`useReceipt.ts` L263-282), and every "Verify ↗ / Open on BaseScan ↗" link in the ready receipt points to `#` (`EudaimoniaReceipt.tsx` L35-37 passes no tx/chain context).
- No Vercel project exists, so there's no public URL.

**Outcome:** a reviewer opens a public `*.vercel.app` URL, sends a $1–$5 **test** donation in about 1 minute (no wallet, no KYC, no real money), and lands on a real receipt with working Base Sepolia explorer links. The real-money launch (mainnet, multisig, Stripe live, legal) is cut from scope. Its code stays as the documented production design.

**User decisions:** (1) the demo uses a direct `router.donate()` (1 tx) from a server-side test wallet, with **no router contract changes**; the Stripe→`routeHeld` relayer (E3.4) stays a later epic. (2) Create a Vercel project in this epic.

**Defaults (approved 2026-10-01):** amounts $1/$2/$5 with no custom amount; a cap of 25 demo donations per day; contract verification on Blockscout (needs no key), plus Basescan only if you add an Etherscan key; you paste the demo key into Vercel yourself so it stays out of the transcript; KV state is in-memory (Upstash is optional); landing-page "Verified by Endaoment" badges stay, because the charities really are on Endaoment and only receipts are relabeled; the URL is `*.vercel.app`.

## Phases (execution order)

### 0. Setup (agent, ~0.5 h)
- Open a PR for the unmerged `chore/tidy-and-dev-setup` commit `f0a689d`, then branch `epic-8-testnet-demo` from it.
- `gh issue create` "Epic 8 — Public testnet demo" on mnkprs/Eudaimonia, in the #4/#5 format. Save this plan as `prompts/epic-8-testnet-demo-plan.md` with the issue link, a `Status:` resume line and the branch (per CLAUDE.md).

### 1. Stand-in contracts, TDD (agent, ~3 h). Tests and implementation get separate commits.
- `contracts/src/testnet/EndaomentRegistryStandIn.sol`: immutable `treasury` (the Endaoment-fee recipient) and `getDonationFeeWithOverrides(address) → 150`. Reverts on chainid 8453.
- `contracts/src/testnet/EndaomentOrgStandIn.sol` (`is IEndaomentEntity`, SafeERC20): `donate(amount)` pulls 1.5% to `registry.treasury()` and the rest to itself, in Endaoment's order. It exposes `baseToken()`, `registry()`, a `name` of "TESTNET STAND-IN (not Endaoment): <charity>", and a manager-only `withdraw(to, amount)` to recycle test USDC. Reverts on 8453.
- `test/testnet/RouterWithStandIn.t.sol`: checks balance deltas and Transfer-log order (donor→router, router→treasury, router→fee recipient, router→org, then `DonationRouted`). This ties the Solidity output to `decodeRouterReceipt` and `verifyDonation`.
- `script/DeployTestnetDemo.s.sol` + test: refuses any chainid other than 84532; deploys the registry, 3 orgs and the router; allowlists the 3; logs ready-to-paste env lines.
- These interfaces let the existing `test/fork/DeployedRouterFork.t.sol` verify the Sepolia deployment unchanged.

### 2. Human gate (owner, ~10 min; keystores were created by the agent, so only funding remains)
1. ~~`cast wallet new` for three keystores~~ — done by the agent (`eudaimonia-deployer`, `eudaimonia-treasury`, `eudaimonia-demo`; random passwords in `~/.foundry/pw/`, chmod 600, never printed).
2. Fund **only the deployer**: 20 USDC from faucet.circle.com (Base Sepolia) and ≥0.0005 ETH from a Base Sepolia faucet.
3. Optional: an Etherscan API key (shows verified source on Basescan).

### 3. Live Sepolia deploy (agent with keystores, ~1–1.5 h)
- Preflight (chain id, balances) → dry run → `--broadcast --slow --verify --verifier blockscout`.
- Move ~19 USDC and some ETH from the deployer to the demo wallet; the demo wallet runs `approve(router, max)` once.
- Run `DeployedRouterFork.t.sol` against Sepolia for each org, then one `cast` donate per charity to check the 1% / 1.5% / rest split.
- Record addresses, tx hashes and links in `contracts/deployments/base-sepolia.json`. Comment the evidence on #5.

### 4. Receipt fixes, TDD (agent, ~3 h)
- `src/lib/endaoment/registry.ts`: add `getCharityByOrgAddress(org, chainId, map?)`, lifted from `findCharityNameByOrgAddress` (`loadReceiptForMetadata.ts` L84-99). `src/lib/contracts.ts`: add `findDonationRouted(logs)`. Refactor `loadReceiptForMetadata` to use both.
- `useReceipt.ts`: choose the charity from the receipt's `DonationRouted.org`, not the first campaign; add an injectable `orgAddressMap`. Add `buildFixtureReceipt({org})` + `FIXTURE_ORG_MAP` in `src/lib/receipt/fixtures.ts`. Tests cover WCK, Direct Relief and an unknown org.
- `EudaimoniaReceipt` gets `chainId` and passes tx/explorer context to `PizzaTracker`, `VerificationCard` and `CharityCard`, so the links are real. Add `resolveAppChainId()` in `src/lib/chain.ts` to replace the inline ternaries in `receipt/[txid]/page.tsx` and `opengraph-image.tsx`.
- Testnet labeling when `data.network === "Base Sepolia"`: a "Testnet stand-in" badge variant, fee strip "Endaoment fee (stand-in)", a footer saying no real money and not affiliated with Endaoment, and a `buildStages` "testnet-demo" copy variant.

### 5. Demo donate API, TDD (agent, ~4 h)
- `src/lib/demo/constants.ts`: presets `[100,200,500]` cents, bounds, `centsToUsdcUnits`.
- `src/lib/demo/env.ts`: its own lazy Zod schema, independent of `server.ts`, so no Stripe or KV is required. It requires `NEXT_PUBLIC_CHAIN === "base-sepolia"`, `DEMO_DONATIONS_ENABLED=true` (the kill switch) and `DEMO_WALLET_PRIVATE_KEY` (never echoed in errors). The router address comes from `getRouterAddress(84532)`.
- `src/lib/demo/chain-gateway.ts`: viem `privateKeyToAccount` + `createWalletClient({chain: baseSepolia})`. `readWalletState()` returns USDC, allowance, ETH and pending nonce; `sendDonation()` does `simulateContract` then `writeContract(donate)`. Minimal donate/ERC-20 ABIs go in `contracts.ts`.
- `src/lib/demo/send-lock.ts`: a KV `setNx` lock with a token-checked release, so sends are serialized for nonce safety, plus one retry on a nonce error.
- Extract `clientIdentifier` to `src/lib/ratelimit/client-identifier.ts` and reuse it in the session route. Add the demo key to logger redaction. `onramp-kv.ts`: treat the example placeholder KV config as unusable.
- `src/app/api/demo/donate/route.ts`: a pure `handleDemoDonate(req, deps)`. It reuses `createRateLimiter` twice (per IP, 3 per 10 min; a global daily cap of 25), `onrampKvStore()`, the `{error:{code,message}}` envelope and `logger`.
  - Codes: `demo_disabled` 503, `invalid_request` 400, `rate_limited` 429, `demo_daily_cap` 429, `demo_busy` 503, `demo_wallet_empty` 503, `chain_error` 502.
  - Returns `{txHash}` right after send; the receipt page already polls for confirmation.
  - The per-IP limiter fails open; the cap and lock fail closed.

### 6. Checkout demo mode, TDD (agent, ~3 h)
- `src/lib/checkout/donation-mode.ts`: `resolveDonationMode()` returns demo on base-sepolia by default and is **always onramp on base**. `src/lib/checkout/policy.ts`: `ONRAMP_POLICY` / `DEMO_POLICY` (presets, custom on or off, max, whether email is collected, whether card processing shows, labels).
- Thread the policy through `checkoutFormState.ts`, `fees.ts` (no card row in demo), `AmountSelector` (`allowCustom`) and `CheckoutForm` (`policy` prop; onramp output unchanged).
- `src/lib/checkout/demoSubmit.ts`: POSTs to `/api/demo/donate`, validates the 32-byte hash, and redirects to `/receipt/<hash>` (the path is built client-side). `DemoNotice.tsx` shows "Testnet demo — no real money", per DESIGN.md. Wire both modes in `donate/[campaignId]/page.tsx`.
- Pin `NEXT_PUBLIC_DONATION_MODE=onramp` in `playwright.config.ts` `webServer.env` so the existing e2e specs keep passing.

### 7. Wire the deployment into the app (agent, after phase 3, ~1 h)
- `orgs.ts`: replace the 84532 entries with the stand-in addresses (keep the old counterfactual ones in a comment).
- `src/lib/demo/sample-receipts.ts`: the 3 smoke-test tx hashes. Wire the dead anchors in `Hero.tsx`, `HeroReceiptMockup.tsx`, `CreamBand.tsx`, `ClosingCTA.tsx` and `NavBar.tsx` to a real sample receipt; each stays hidden or disabled when there are none. Update the `Hero` / `CreamBand` tests.

### 8. Local live run (agent, ~1 h)
- `.env.local`: set the router address, `DEMO_DONATIONS_ENABLED`, and the demo key piped in from `cast wallet private-key`, never echoed. Remove the placeholder KV lines.
- `npm run dev`, then one UI donation per charity. Each should reach a ready receipt with the right charity, working links and stand-in labels. **Close #5** with the evidence.

### 9. Vercel hosting (agent via MCP; you ~5 min)
- `create_git_project` (repo mnkprs/Eudaimonia, team `team_c9Jn7bwd8fAc8nfdZlL2PbnW`, project "eudaimonia"). If it returns `requires_user_action`, you approve the GitHub app.
- `update_project`: install command `npm ci` (the repo has a stray pnpm lockfile), Node 22.x.
- `create_project_env`: `NEXT_PUBLIC_CHAIN=base-sepolia`, `NEXT_PUBLIC_DONATION_MODE=demo`, `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`, `NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA`, `USDC_CONTRACT_BASE_SEPOLIA`, `DEMO_DONATIONS_ENABLED`, `DEMO_DAILY_CAP`. **You** paste `DEMO_WALLET_PRIVATE_KEY` as Sensitive in the dashboard.
- Smoke-test a preview deploy with `web_fetch_vercel_url`. Merging the epic PR to main (your call) triggers production. Then smoke-test the public URL and check `get_runtime_logs`.

### 10. Docs and issues (agent, ~1.5 h)
- `README.md`: a "Try the demo" section (URL, steps, what's real vs stand-in, address table, sample receipts); fix outdated flow step 4; change status to portfolio.
- New `docs/adr/0003-testnet-demo.md`. Add a testnet section to `contracts/DEPLOY.md` and a demo env profile to `docs/DEPLOY-VERCEL.md`.
- `prompts/post-epic-actions.md`: mark real-money launch items "out of scope (portfolio)" and log the parked Stripe bugs:
  - `destination_network=base-sepolia`
  - `/processing` reads `inMemorySessionStore`
  - no Stripe return URL
  - ProcessingClient redirects to a settlement tx that has no `DonationRouted`
  - EU doesn't support USDC on Base
  - the sandbox needs an approved application
- `prompts/HUMAN-ACTIONS.md`: add a "Demo ops" section (refill, recycle via `withdraw`, kill switch, rotate the demo key).
- Rewrite #4's acceptance (live Stripe run out of scope; code and tests complete; parked bugs linked) and close it. Open the epic PR and run the `code-review` skill.

## Reuse (don't rebuild)
- Rate limiting: `createRateLimiter` (`src/lib/ratelimit/rate-limiter.ts`).
- KV: `onrampKvStore()` and the `KvStore` interface.
- Route pattern: `handleCreateSession` (`src/app/api/onramp/session/route.ts`).
- Logging and redaction: `logger` (`src/lib/log/logger.ts`).
- Chain helpers: `getRouterAddress` and `decodeDonationRoutedLog` (`src/lib/contracts.ts`), `getOrgAddress` (`orgs.ts`), `getCharity` (`registry.ts`).
- Verification: `verifyDonation` already handles the two-transfer Endaoment fee model.
- Post-deploy proof: `DeployedRouterFork.t.sol`.
- Amount presets: the `AmountSelector` `presetsCents` prop.
- Test fixtures: `src/lib/receipt/fixtures.ts`.

## Verification
1. **Contracts:** `cd contracts && forge build && forge test -vvv` passes, `forge coverage` shows 100% on `src/testnet/*`, and `DeployedRouterFork` passes against Sepolia for all 3 orgs.
2. **App:** `npm run lint`, `npx tsc --noEmit`, `npm test` (coverage ≥80%, `src/lib/demo/*` ≥90%) and `npm run build` all pass.
3. **Live Sepolia, per charity:**
   - the treasury gets +1%, the fee recipient +1.5% of net, and the stand-in the rest
   - a UI donation reaches a ready receipt with the correct charity, stand-in labels, and working tx, event-log and address links
4. **Public URL:**
   - the landing page loads and the example-receipt CTA works
   - a fresh browser with no wallet completes a $1 donation to a ready receipt in under ~60 s
   - a 4th rapid POST from one IP returns 429
   - a mainnet build can't enable demo mode (unit-tested)

## Effort
About **20 h of agent work** (~2.5 days); phases 4–6 run in parallel with your phase 2. **Your part: about 30–40 min** (keystores and faucets, the optional Etherscan key, the Vercel GitHub approval, pasting the demo key, merging the PR).

## Risks
- **Thin test funds.** 20 test USDC covers about 4–20 donations. The stand-in's `withdraw`, plus the treasury and fee recipient, let the agent recycle funds to the demo wallet; when it's empty the API returns `demo_wallet_empty` with a link to sample receipts.
- **Per-instance limits.** Without Upstash, the lock and caps are per serverless instance. The nonce retry covers the gap; Upstash is a later option.
- **Shared public RPC.** `sepolia.base.org` is a shared public endpoint, so it may rate-limit. An optional server-only `BASE_SEPOLIA_RPC_URL` avoids that.
- **Build-time env.** `NEXT_PUBLIC_*` values are baked in at build, so changing the router address needs a redeploy.
