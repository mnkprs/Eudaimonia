# Deploying the TransparentDonationRouter (Epic 4 Task 6)

Operator runbook for deploying the router to Base Sepolia and Base mainnet.
This is an **outward-facing, irreversible action** — it broadcasts a real
transaction and spends gas. CI does not run it; an operator with funded keys
does, deliberately.

The deploy script (`script/Deploy.s.sol`) is fully unit-tested
(`test/Deploy.t.sol`) via its `_deploy` seam, so the wiring is proven before
any broadcast.

## 0. Public testnet demo stack (Epic 8 — what the live demo runs)

The portfolio demo ([ADR 0003](../docs/adr/0003-testnet-demo.md)) does not use
the steps below. It deploys the router **plus testnet stand-ins for Endaoment**
in one broadcast, because Endaoment's Base Sepolia entities can't accept
Circle's test USDC. `script/DeployTestnetDemo.s.sol` refuses every chain except
Base Sepolia, and the stand-in constructors refuse Ethereum and Base mainnet.

Roles (local Foundry keystores; passwords in `~/.foundry/pw/<name>`, chmod 600):

| Keystore | Role |
|---|---|
| `eudaimonia-deployer` | Broadcasts, owns the router, manages the stand-ins, receives the stand-in Endaoment fee |
| `eudaimonia-treasury` | Receives the 1% platform fee |
| `eudaimonia-demo` | The server-side donor (`DEMO_WALLET_PRIVATE_KEY` on Vercel — testnet only) |

```sh
cd contracts
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export TREASURY_ADDRESS=$(cast wallet address --account eudaimonia-treasury --password-file ~/.foundry/pw/eudaimonia-treasury)
export OWNER_ADDRESS=$(cast wallet address --account eudaimonia-deployer --password-file ~/.foundry/pw/eudaimonia-deployer)
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

forge script script/DeployTestnetDemo.s.sol:DeployTestnetDemo \
  --rpc-url base_sepolia \
  --account eudaimonia-deployer --password-file ~/.foundry/pw/eudaimonia-deployer \
  --broadcast --slow \
  --verify --verifier blockscout --verifier-url https://base-sepolia.blockscout.com/api/
```

The script logs ready-to-paste env lines (`NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA=…`,
`STANDIN_<CHARITY>=…`). Deployed addresses and tx hashes are recorded in
[`deployments/base-sepolia.json`](deployments/base-sepolia.json); the app's
Base Sepolia org addresses live in `src/lib/endaoment/orgs.ts`.

**After deploying:** fund the demo wallet with test USDC and a little ETH, and
have it approve the router once (`approve(router, max)`); the demo API never
sends approvals. Verify the deployment with `DeployedRouterFork.t.sol` (§6)
using `EXPECTED_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

**Recycling test USDC** (faucets drip 20 USDC per 2 h): each stand-in's
manager can move its balance back to the demo wallet:

```sh
cast send <org-stand-in> "withdraw(address,uint256)" <demo-wallet> <amount-6dp> \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --account eudaimonia-deployer --password-file ~/.foundry/pw/eudaimonia-deployer
```

The treasury and the deployer (stand-in fee recipient) can transfer their
test USDC back the same way with a plain ERC-20 `transfer`.

## Prerequisites

- `forge` on PATH (`C:\Users\<you>\.foundry\bin` on this machine).
- A funded deployer key for the target network (testnet ETH for Sepolia; real
  ETH on Base mainnet).
- A [Basescan API key](https://basescan.org/myapikey) for source verification.

## Environment

The script reads three addresses from the environment:

| Var | Meaning |
|---|---|
| `USDC_ADDRESS` | USDC token on the target network |
| `TREASURY_ADDRESS` | Address that receives the 1% platform fee |
| `OWNER_ADDRESS` | Allowlist owner — curates which Endaoment orgs `donate` may forward to (H1). **Must be a multisig in production** (see review M4). |

Canonical USDC addresses:

- **Base mainnet:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Sepolia:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

`foundry.toml` already maps the `base` / `base_sepolia` RPC aliases and the
Basescan keys (`BASE_RPC_URL`, `BASE_SEPOLIA_RPC_URL`, `BASESCAN_API_KEY`).

## 1. Base Sepolia (do this first)

```powershell
$env:USDC_ADDRESS     = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
$env:TREASURY_ADDRESS = "<your treasury address>"
$env:OWNER_ADDRESS    = "<allowlist owner — a multisig on mainnet>"
$env:BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org"   # or an authenticated URL
$env:BASESCAN_API_KEY = "<key>"

forge script script/Deploy.s.sol:Deploy `
  --rpc-url base_sepolia `
  --account <keystore-account> `    # or --private-key / --ledger
  --broadcast --verify
```

The script logs `TransparentDonationRouter deployed at: 0x...`. Send a sample
donation and confirm the 1/99 split on Basescan.

## 2. Base mainnet

Same command with `--rpc-url base` and the mainnet USDC address. Double-check
`TREASURY_ADDRESS` before broadcasting — it is immutable once deployed.

## 3. Allowlist the target orgs (required — donations revert until you do)

`donate` forwards only to orgs the owner has vetted (H1). A freshly deployed
router has an **empty allowlist, so every donation reverts with `OrgNotAllowed`**
until the owner allowlists each Endaoment org. From the `OWNER_ADDRESS` account
(the multisig on mainnet):

```solidity
router.setOrgAllowed(<endaomentOrg>, true);   // repeat per org; false to revoke
```

Resolve each org's real Entity address from Endaoment's `OrgFundFactory` /
integration API (entities are created per-org, not static) and confirm its
on-chain `baseToken()` is the canonical Base USDC before allowlisting. Emits
`OrgAllowanceUpdated(org, allowed)` for an on-chain audit trail.

## 4. Appoint the routing operator (required for the fiat on-ramp path)

Stripe's Crypto Onramp settles USDC into the router with a **plain ERC-20
transfer** — it cannot call `donate()`. Held settlements are split by
`routeHeld(sessionRef, org, amount)`, callable only by the owner or an
owner-appointed operator (C1). From the `OWNER_ADDRESS` account:

```solidity
router.setOperator(<operator>);   // zero address disables operator routing
```

The operator key never custodies funds — it only triggers the split, and only
toward allowlisted orgs; each `sessionRef` is consumed exactly once on-chain.
The owner always works as a fallback caller of `routeHeld`. Emits
`OperatorUpdated(previous, next)`.

## 5. Wire the address into the app env

No code change. Set the deployed address in the app environment — **both**
the `NEXT_PUBLIC_` frontend var and the server-side var the onramp session
builder reads (`src/lib/onramp/createSession.ts`):

```
ROUTER_ADDRESS_BASE_SEPOLIA=0x<deployed-on-sepolia>
NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA=0x<deployed-on-sepolia>
ROUTER_ADDRESS_BASE=0x<deployed-on-mainnet>
NEXT_PUBLIC_ROUTER_ADDRESS_BASE=0x<deployed-on-mainnet>
```

`src/lib/contracts.ts#getRouterAddress(chainId)` then returns the address for
the active chain (and `undefined` until set). Verify with the
`src/lib/contracts.test.ts` suite, which hash-binds the frontend
`DonationRouted` ABI to the on-chain event signature. Server-side, mainnet
session creation refuses until `ROUTER_ADDRESS_BASE` is set.

## 6. Verify the deployed state (post-deployment proof)

`test/fork/DeployedRouterFork.t.sol` ATTACHES to the deployed router on a fork
and asserts its actual state — immutables, owner, fee constants, allowlist —
then smoke-runs `donate()` and `routeHeld()` against the real Endaoment org:

```sh
BASE_RPC_URL=<rpc> ROUTER_ADDRESS=0x<deployed> ENDAOMENT_ORG=0x<org> \
EXPECTED_TREASURY=0x<treasury> EXPECTED_OWNER=0x<owner> FORK_BLOCK=<n> \
forge test --match-path 'test/fork/DeployedRouterFork.t.sol'
```

(For a Base Sepolia deployment, also set `EXPECTED_USDC` to the Sepolia USDC —
the default expectation is Base mainnet USDC.) The fresh-contract suite
(`RouterFork.t.sol`) is an integration test of the *code*, not a proof of the
*deployment* — only this attached suite catches a wrong immutable, wrong
owner, or missing allowlist entry.
