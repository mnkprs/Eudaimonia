import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type Transport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ERC20_ABI, ROUTER_DONATE_ABI } from "./abi";

/**
 * Thin viem wrapper around the demo wallet. Pinned to Base Sepolia: the wallet
 * client carries `chain: baseSepolia`, so viem refuses to sign/send when the
 * RPC node reports any other chain id (e.g. a mainnet URL set by mistake).
 * The gateway never sends `approve`; the operator pre-approves the router.
 */

export interface DemoChainGatewayConfig {
  readonly privateKey: Hex;
  readonly rpcUrl: string;
  readonly routerAddress: Address;
  readonly usdcAddress: Address;
  /** Injectable for tests (viem `custom` transport); defaults to `http(rpcUrl)`. */
  readonly transport?: Transport;
}

export interface DemoWalletState {
  readonly address: Address;
  readonly usdcBalance: bigint;
  readonly allowance: bigint;
  readonly ethBalance: bigint;
  /** Next nonce including pending txs, so back-to-back sends don't collide. */
  readonly pendingNonce: number;
}

export interface SendDonationInput {
  readonly org: Address;
  readonly amount: bigint;
  readonly nonce: number;
}

export interface DemoChainGateway {
  readWalletState(): Promise<DemoWalletState>;
  sendDonation(input: SendDonationInput): Promise<Hex>;
}

export function createDemoChainGateway(
  config: DemoChainGatewayConfig,
): DemoChainGateway {
  const { routerAddress, usdcAddress } = config;
  const account = privateKeyToAccount(config.privateKey);
  const transport = config.transport ?? http(config.rpcUrl);
  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport,
  });

  return {
    async readWalletState() {
      const [usdcBalance, allowance, ethBalance, pendingNonce] =
        await Promise.all([
          publicClient.readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [account.address],
          }),
          publicClient.readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [account.address, routerAddress],
          }),
          publicClient.getBalance({ address: account.address }),
          publicClient.getTransactionCount({
            address: account.address,
            blockTag: "pending",
          }),
        ]);
      return {
        address: account.address,
        usdcBalance,
        allowance,
        ethBalance,
        pendingNonce,
      };
    },

    async sendDonation({ org, amount, nonce }) {
      // viem signs with the configured chain's id regardless of what the node
      // serves, so verify the RPC really is Base Sepolia before any simulate/send.
      const nodeChainId = await publicClient.getChainId();
      if (nodeChainId !== baseSepolia.id) {
        throw new Error(
          `Demo RPC reports chain ${nodeChainId}, expected ${baseSepolia.id}`,
        );
      }
      const { request } = await publicClient.simulateContract({
        account,
        address: routerAddress,
        abi: ROUTER_DONATE_ABI,
        functionName: "donate",
        args: [org, amount],
      });
      return walletClient.writeContract({ ...request, nonce });
    },
  };
}
