import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import DonatePage from "@/app/donate/[campaignId]/page";
import { CAMPAIGNS, getCampaignById } from "@/lib/campaigns";

function paramsFor(campaignId: string): Promise<{ campaignId: string }> {
  return Promise.resolve({ campaignId });
}

async function renderDonatePage(campaignId: string): Promise<string> {
  const element = await DonatePage({ params: paramsFor(campaignId) });
  return renderToString(element);
}

/** SSR encodes `'` as `&#x27;`. Match either form for substring assertions. */
function encodeApostrophes(value: string): string {
  return value.replace(/'/g, "&#x27;");
}

/** Next.js 15+ throws either `NEXT_HTTP_ERROR_FALLBACK;404` (newer) or `NEXT_NOT_FOUND` (older). */
const NOT_FOUND_PATTERN = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DonatePage — demo mode (default off mainnet)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN", "base-sepolia");
    vi.stubEnv("NEXT_PUBLIC_DONATION_MODE", "");
  });

  test("renders the testnet notice and the demo CTA", async () => {
    const html = await renderDonatePage("pcrf");
    expect(html).toContain("TESTNET");
    expect(html).toContain("Testnet demo — no real money.");
    expect(html).toContain("Send test donation");
  });

  test("does not collect an email or offer a custom amount", async () => {
    const html = await renderDonatePage("pcrf");
    expect(html).not.toContain("Email for receipt");
    expect(html).not.toContain("Custom");
  });
});

describe("DonatePage — mainnet is always on-ramp", () => {
  test("ignores NEXT_PUBLIC_DONATION_MODE=demo on base", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN", "base");
    vi.stubEnv("NEXT_PUBLIC_DONATION_MODE", "demo");
    const html = await renderDonatePage("pcrf");
    expect(html).not.toContain("TESTNET");
    expect(html).toContain("Email for receipt");
  });
});

describe("DonatePage (/donate/[campaignId]) — on-ramp mode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DONATION_MODE", "onramp");
  });

  test("invalid campaign id triggers Next.js notFound()", async () => {
    await expect(
      DonatePage({ params: paramsFor("does-not-exist-xyz") }),
    ).rejects.toThrow(NOT_FOUND_PATTERN);
  });

  test("valid id renders the campaign's name in the page output", async () => {
    const pcrf = getCampaignById("pcrf");
    if (!pcrf) throw new Error("test fixture missing: pcrf campaign");
    const html = await renderDonatePage("pcrf");
    expect(html).toContain(encodeApostrophes(pcrf.name));
  });

  test("renders the campaign's tag and EIN (CampaignSummary present)", async () => {
    const wck = getCampaignById("wck");
    if (!wck) throw new Error("test fixture missing: wck campaign");
    const html = await renderDonatePage("wck");
    expect(html).toContain(wck.tag);
    expect(html).toContain(wck.ein);
  });

  test("renders CheckoutForm (form element + Donate CTA visible)", async () => {
    const html = await renderDonatePage("pcrf");
    expect(html).toMatch(/<form\b/);
    expect(html).toContain("Donate");
    expect(html).toContain("Email for receipt");
    expect(html).not.toContain("TESTNET");
  });

  test("renders consistent shell: NavBar (<nav>) and Footer (<footer>)", async () => {
    const html = await renderDonatePage("directrelief");
    expect((html.match(/<nav\b/g) ?? []).length).toBe(1);
    expect((html.match(/<footer\b/g) ?? []).length).toBe(1);
  });

  test("renders a single <main> landmark wrapping the donate flow", async () => {
    const html = await renderDonatePage("pcrf");
    expect((html.match(/<main\b/g) ?? []).length).toBe(1);
  });

  test("renders the decorative CheckoutMesh backdrop", async () => {
    const html = await renderDonatePage("pcrf");
    expect(html).toMatch(/data-checkout-mesh/);
  });

  test("each canonical campaign id renders without throwing", async () => {
    for (const campaign of CAMPAIGNS) {
      const html = await renderDonatePage(campaign.id);
      expect(html).toContain(encodeApostrophes(campaign.name));
    }
  });
});
