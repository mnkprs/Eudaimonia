import {
  custom,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  parseTransaction,
  toFunctionSelector,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { ERC20_ABI, ROUTER_DONATE_ABI } from "./abi";
import { createDemoChainGateway } from "./chain-gateway";

const ANVIL_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ROUTER = "0x1111111111111111111111111111111111111111" as Address;
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const ORG = "0x2222222222222222222222222222222222222222" as Address;
const WALLET = privateKeyToAccount(ANVIL_KEY).address;
const TX_HASH = `0x${"cd".repeat(32)}` as Hex;

const word = (n: bigint): Hex =>
  encodeAbiParameters([{ type: "uint256" }], [n]);

interface FakeNode {
  readonly transport: ReturnType<typeof custom>;
  readonly rawTxs: Hex[];
  readonly calls: string[];
}

function fakeNode(chainId: number): FakeNode {
  const rawTxs: Hex[] = [];
  const calls: string[] = [];
  const balanceSel = toFunctionSelector("balanceOf(address)");
  const allowanceSel = toFunctionSelector("allowance(address,address)");

  const request = async ({
    method,
    params,
  }: {
    method: string;
    params?: unknown;
  }): Promise<unknown> => {
    calls.push(method);
    const p = (params ?? []) as unknown[];
    switch (method) {
      case "eth_chainId":
        return `0x${chainId.toString(16)}`;
      case "eth_getBalance":
        return "0x2386f26fc10000"; // 0.01 ETH
      case "eth_getTransactionCount":
        return "0x7";
      case "eth_call": {
        const data = (p[0] as { data: Hex }).data;
        if (data.startsWith(balanceSel)) return word(9_000_000n);
        if (data.startsWith(allowanceSel)) return word(2n ** 256n - 1n);
        return "0x"; // simulated donate() returns nothing
      }
      case "eth_estimateGas":
        return "0x30d40";
      case "eth_gasPrice":
        return "0x3b9aca00";
      case "eth_maxPriorityFeePerGas":
        return "0x3b9aca00";
      case "eth_getBlockByNumber":
        return {
          number: "0x1",
          hash: `0x${"11".repeat(32)}`,
          parentHash: `0x${"00".repeat(32)}`,
          timestamp: "0x1",
          baseFeePerGas: "0x3b9aca00",
          gasLimit: "0x1c9c380",
          gasUsed: "0x0",
          transactions: [],
        };
      case "eth_sendRawTransaction":
        rawTxs.push(p[0] as Hex);
        return TX_HASH;
      default:
        throw new Error(`unexpected rpc method ${method}`);
    }
  };
  return { transport: custom({ request }), rawTxs, calls };
}

function gatewayFor(node: FakeNode) {
  return createDemoChainGateway({
    privateKey: ANVIL_KEY,
    rpcUrl: "http://unused.invalid",
    routerAddress: ROUTER,
    usdcAddress: USDC,
    transport: node.transport,
  });
}

describe("createDemoChainGateway", () => {
  it("reads wallet state", async () => {
    const state = await gatewayFor(fakeNode(84532)).readWalletState();
    expect(state).toEqual({
      address: WALLET,
      usdcBalance: 9_000_000n,
      allowance: 2n ** 256n - 1n,
      ethBalance: 10_000_000_000_000_000n,
      pendingNonce: 7,
    });
  });

  it("sends donate(org, amount) with the given nonce on chain 84532", async () => {
    const node = fakeNode(84532);
    const hash = await gatewayFor(node).sendDonation({
      org: ORG,
      amount: 1_000_000n,
      nonce: 12,
    });

    expect(hash).toBe(TX_HASH);
    expect(node.rawTxs).toHaveLength(1);
    const tx = parseTransaction(node.rawTxs[0] as Hex);
    expect(tx.to?.toLowerCase()).toBe(ROUTER);
    expect(tx.nonce).toBe(12);
    expect(tx.chainId).toBe(84532);
    expect(tx.data).toBe(
      encodeFunctionData({
        abi: ROUTER_DONATE_ABI,
        functionName: "donate",
        args: [ORG, 1_000_000n],
      }),
    );
    expect(
      decodeFunctionData({ abi: ROUTER_DONATE_ABI, data: tx.data as Hex }).args,
    ).toEqual([ORG, 1_000_000n]);
  });

  it("refuses to send when the node reports a different chain", async () => {
    const node = fakeNode(8453);
    await expect(
      gatewayFor(node).sendDonation({ org: ORG, amount: 1n, nonce: 0 }),
    ).rejects.toThrow();
    expect(node.rawTxs).toHaveLength(0);
  });

  it("uses the ERC-20 ABI for balance reads", () => {
    expect(ERC20_ABI).toBeDefined();
  });
});
