import { describe, expect, it } from "vitest";
import {
  CAMPAIGNS,
  campaignHref,
  getCampaignById,
  getCampaigns,
} from "./campaigns";
import type { Campaign } from "@/types/campaign";

const EIN_PATTERN = /^\d{2}-\d{7}$/;
const REQUIRED_STRING_FIELDS: Array<keyof Campaign> = [
  "id",
  "name",
  "ein",
  "tag",
  "mission",
  "swatch",
  "swatch2",
  "photoCaption",
];

describe("getCampaigns", () => {
  it("returns the hardcoded campaigns in declared order", () => {
    const result = getCampaigns();

    expect(result).toEqual(CAMPAIGNS);
    expect(result.map((c) => c.id)).toEqual(["pcrf", "wck", "directrelief"]);
  });

  it("returns a fresh array each call to protect registry from mutation", () => {
    const first = getCampaigns();
    const second = getCampaigns();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

describe("getCampaignById", () => {
  it("returns the PCRF entry by id", () => {
    const result = getCampaignById("pcrf");

    expect(result).toBeDefined();
    expect(result?.name).toBe("Palestine Children's Relief Fund");
    expect(result?.ein).toBe("93-1057665");
  });

  it("returns the WCK entry by id", () => {
    expect(getCampaignById("wck")?.name).toBe("World Central Kitchen");
  });

  it("returns the Direct Relief entry by id", () => {
    expect(getCampaignById("directrelief")?.name).toBe("Direct Relief");
  });

  it("returns undefined for an unknown id", () => {
    expect(getCampaignById("unknown")).toBeUndefined();
  });
});

describe("campaign data contract", () => {
  it.each(CAMPAIGNS)("$id has a valid EIN format", (campaign) => {
    expect(campaign.ein).toMatch(EIN_PATTERN);
  });

  it.each(CAMPAIGNS)(
    "$id has non-empty values for every required string field",
    (campaign) => {
      for (const field of REQUIRED_STRING_FIELDS) {
        expect(campaign[field], `field ${field} on ${campaign.id}`).toBeTruthy();
        expect(typeof campaign[field]).toBe("string");
      }
    },
  );

  it("has no duplicate campaign ids", () => {
    const ids = CAMPAIGNS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate EINs", () => {
    const eins = CAMPAIGNS.map((c) => c.ein);
    expect(new Set(eins).size).toBe(eins.length);
  });

  it("does not leak fake live stats into the registry shape", () => {
    for (const campaign of CAMPAIGNS) {
      expect(campaign).not.toHaveProperty("raised");
      expect(campaign).not.toHaveProperty("donors");
      expect(campaign).not.toHaveProperty("receipts");
    }
  });
});

describe("campaignHref", () => {
  it("returns the donate route for a campaign", () => {
    const pcrf = getCampaignById("pcrf");
    expect(pcrf).toBeDefined();
    expect(campaignHref(pcrf as Campaign)).toBe("/donate/pcrf");
  });

  it("works for every registered campaign", () => {
    for (const campaign of CAMPAIGNS) {
      expect(campaignHref(campaign)).toBe(`/donate/${campaign.id}`);
    }
  });
});

describe("campaign websites (receipt 'Visit charity')", () => {
  it("every campaign has an https website", async () => {
    const { CAMPAIGNS, getCampaignByEin } = await import("@/lib/campaigns");
    for (const campaign of CAMPAIGNS) {
      expect(campaign.website).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/?$/);
      expect(getCampaignByEin(campaign.ein)?.id).toBe(campaign.id);
    }
    expect(getCampaignByEin("00-0000000")).toBeUndefined();
  });
});
