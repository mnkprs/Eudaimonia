// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test } from "vitest";
import { base, baseSepolia } from "wagmi/chains";

import { PizzaTracker } from "@/components/receipt/PizzaTracker";
import type { Stage } from "@/types/receipt";

const fixtureStages: Stage[] = [
  {
    n: 1,
    title: "Donated",
    short: "Donor sent ETH on Base.",
    timestamp: "17:34:01 UTC",
    relative: "+0s",
    amount: "0.0000627",
    unit: "ETH",
    address: "0xe0adb1…7a097bb",
    addressLabel: "From wallet",
    detail: "Original donor wallet.",
    contract: "EOA",
  },
  {
    n: 2,
    title: "Converted",
    short: "Swap to USDC on a Base AMM.",
    timestamp: "17:34:02 UTC",
    relative: "+1s",
    amount: "1.001017",
    unit: "USDC",
    address: "Uniswap v3 · 0.05%",
    addressLabel: "Liquidity pool",
    detail: "ETH→USDC swap.",
    contract: "Uniswap v3",
    feeOnHover: {
      label: "AMM swap fee",
      amount: "0.0015",
      to: "Uniswap LPs",
    },
  },
  {
    n: 3,
    title: "Routed",
    short: "USDC entered the Endaoment fund.",
    timestamp: "17:34:03 UTC",
    relative: "+2s",
    amount: "1.001017",
    unit: "USDC",
    address: "0xorg…fund",
    addressLabel: "OrgFundFactory",
    detail: "Endaoment OrgFundFactory.",
    contract: "Endaoment · OrgFundFactory",
  },
  {
    n: 4,
    title: "Eudaimonia fee",
    short: "Platform fee held on routing.",
    timestamp: "—",
    relative: "—",
    amount: "0.00",
    unit: "USDC",
    address: "—",
    addressLabel: "Treasury",
    detail: "Future platform fee.",
    contract: "Eudaimonia Treasury",
    inactive: true,
  },
  {
    n: 5,
    title: "Settled",
    short: "Funds delivered to charity multisig.",
    timestamp: "17:34:06 UTC",
    relative: "+5s",
    amount: "1.001017",
    unit: "USDC",
    address: "0xchar…fund",
    addressLabel: "Charity multisig",
    detail: "Final settlement.",
    contract: "Charity Safe",
    terminal: true,
  },
];

describe("PizzaTracker", () => {
  test("renders the section heading copy", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain("The path");
    expect(html).toContain("Where the dollar went, step by step.");
  });

  test("renders every stage title and zero-padded ordinal", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    for (const stage of fixtureStages) {
      expect(html).toContain(stage.title);
      expect(html).toContain(`0${stage.n}`);
    }
  });

  test("renders stage amounts with unit labels for active stages", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain("0.0000627");
    expect(html).toContain("ETH");
    expect(html).toContain("1.001017");
    expect(html).toContain("USDC");
  });

  test("renders the inactive stage's own detail and the default FUTURE chip", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain("Future");
    expect(html).toContain("Future platform fee.");
  });

  test("an inactive conversion stage shows its own label and detail, never the fee copy", () => {
    const converted: Stage = {
      ...fixtureStages[3],
      n: 2,
      title: "Converted",
      detail: "Converted off-chain by the onramp.",
      inactive: true,
      inactiveLabel: "Off-chain",
    };
    const html = renderToString(<PizzaTracker stages={[converted]} />);
    expect(html).toContain("Off-chain");
    expect(html).toContain("Converted off-chain by the onramp.");
    expect(html).not.toContain("no Eudaimonia fee was charged");
    expect(html).not.toContain(">Future<");
  });

  test("omits the value block for inactive stages (no amount line shown)", () => {
    const inactiveOnly: Stage[] = [
      { ...fixtureStages[3], amount: "999.999", inactive: true },
    ];
    const html = renderToString(<PizzaTracker stages={inactiveOnly} />);
    expect(html).not.toContain("999.999");
  });

  test("renders Verify link for each non-inactive stage", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    const verifyMatches = html.match(/Verify ↗/g) ?? [];
    // 4 active stages out of 5 (one inactive)
    expect(verifyMatches.length).toBe(4);
  });

  test("supports minimal variant (no card borders/background)", () => {
    const cardHtml = renderToString(
      <PizzaTracker stages={fixtureStages} variant="card" />,
    );
    const minimalHtml = renderToString(
      <PizzaTracker stages={fixtureStages} variant="minimal" />,
    );
    // Card variant uses a hairline border color somewhere in inline style.
    expect(cardHtml).toContain("#eef2f6");
    // Minimal variant should not render those card borders.
    expect(minimalHtml).not.toContain("#eef2f6");
  });
});

describe("PizzaTracker — per-stage Verify ↗ hrefs", () => {
  const TX =
    "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123" as const;

  test("without txid/chainId props Verify labels render inert (never a dead # link)", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    // No tx context → nothing to verify yet: labels stay visible but inert.
    expect(html).not.toContain('href="#"');
    expect((html.match(/aria-disabled="true"/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  test("with txid + base.id each active-stage Verify link points to basescan.org tx #eventlog", () => {
    const html = renderToString(
      <PizzaTracker stages={fixtureStages} txid={TX} chainId={base.id} />,
    );
    const expectedHref = `href="https://basescan.org/tx/${TX}#eventlog"`;
    const matches = (html.match(new RegExp(expectedHref, "g")) ?? []).length;
    // 4 active stages should each receive this href.
    expect(matches).toBe(4);
  });

  test("with txid + baseSepolia.id each active-stage Verify link points to sepolia.basescan.org tx #eventlog", () => {
    const html = renderToString(
      <PizzaTracker stages={fixtureStages} txid={TX} chainId={baseSepolia.id} />,
    );
    const expectedHref = `href="https://sepolia.basescan.org/tx/${TX}#eventlog"`;
    const matches = (html.match(new RegExp(expectedHref, "g")) ?? []).length;
    expect(matches).toBe(4);
  });

  test("inactive stage never receives a Verify link regardless of txid prop", () => {
    const inactiveOnly: Stage[] = [
      { ...fixtureStages[3], inactive: true },
    ];
    const html = renderToString(
      <PizzaTracker stages={inactiveOnly} txid={TX} chainId={base.id} />,
    );
    expect(html).not.toContain("Verify ↗");
  });
});

describe("PizzaTracker — subtitle stop count is derived from stages.length", () => {
  test("interpolates the stage count instead of hardcoding 'Five'", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain(`${fixtureStages.length} stops`);
    expect(html).not.toContain("Five stops");
  });

  test("reflects a different stage count for a shorter timeline", () => {
    const twoStages = fixtureStages.slice(0, 2);
    const html = renderToString(<PizzaTracker stages={twoStages} />);
    expect(html).toContain("2 stops");
  });
});

describe("PizzaTracker — keyboard focus parity reveals fee detail", () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  test("focusing a stage reveals the same feeOnHover detail that hover reveals", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PizzaTracker stages={fixtureStages} />);
    });

    // The fee detail (financial data) must not be present before focus.
    expect(container.textContent).not.toContain("AMM swap fee");

    // Stage 2 (index 1) carries feeOnHover — locate its focusable container.
    const focusables = container.querySelectorAll<HTMLElement>(
      '[tabindex="0"]',
    );
    const feeStage = Array.from(focusables).find((el) =>
      el.textContent?.includes("Converted"),
    );
    expect(feeStage).toBeDefined();

    act(() => {
      feeStage?.focus();
    });

    // Focus must reveal the fee label + deducted amount, identical to hover.
    expect(container.textContent).toContain("AMM swap fee");
    expect(container.textContent).toContain("0.0015");

    // Blur clears it again, mirroring onMouseLeave.
    act(() => {
      feeStage?.blur();
    });
    expect(container.textContent).not.toContain("AMM swap fee");
  });

  test("focusable stage links to its fee block via aria-describedby (role=tooltip)", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PizzaTracker stages={fixtureStages} />);
    });

    const focusables = container.querySelectorAll<HTMLElement>(
      '[tabindex="0"]',
    );
    const feeStage = Array.from(focusables).find((el) =>
      el.textContent?.includes("Converted"),
    );
    expect(feeStage).toBeDefined();

    const describedBy = feeStage?.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    act(() => {
      feeStage?.focus();
    });

    const tip = describedBy ? document.getElementById(describedBy) : null;
    expect(tip).not.toBeNull();
    expect(tip?.getAttribute("role")).toBe("tooltip");
  });
});
