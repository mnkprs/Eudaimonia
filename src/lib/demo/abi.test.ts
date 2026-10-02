import { toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { ERC20_ABI, ROUTER_DONATE_ABI } from "./abi";

describe("demo ABIs", () => {
  it("donate(address,uint256) has the expected selector", () => {
    expect(toFunctionSelector("donate(address,uint256)")).toBe("0xe69d849d");
    expect(ROUTER_DONATE_ABI[0].name).toBe("donate");
  });

  it("exposes balanceOf and allowance", () => {
    const names = ERC20_ABI.map((item) => item.name);
    expect(names).toEqual(["balanceOf", "allowance"]);
  });
});
