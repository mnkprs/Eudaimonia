import type { Campaign } from "@/types/campaign";

/**
 * Curated campaign registry. Hardcoded for Epic 1; later epics may move this
 * to a server-side data source. Order here is the order rendered on `/`.
 *
 * Source for charity metadata: designs/landing.jsx (5-45).
 * Endaoment org addresses are resolved per-chain by EIN in
 * `src/lib/endaoment/orgs.ts` (Epic 5), not stored on the campaign.
 */
export const CAMPAIGNS: readonly Campaign[] = [
  {
    id: "pcrf",
    name: "Palestine Children's Relief Fund",
    ein: "93-1057665",
    website: "https://www.pcrf.net",
    tag: "Urgent · Gaza",
    mission:
      "Medical aid, trauma care, and surgical missions for injured children across Gaza and the West Bank.",
    swatch: "#c14040",
    swatch2: "#f5e9d4",
    photoCaption: "photo · field clinic, rafah",
  },
  {
    id: "wck",
    name: "World Central Kitchen",
    ein: "27-3521132",
    website: "https://wck.org",
    tag: "Active · Ukraine, Sudan, Gaza",
    mission:
      "Hot meals on the ground within hours of any crisis — wherever cooks can stand up a kitchen.",
    swatch: "#1c1e54",
    swatch2: "#665efd",
    photoCaption: "photo · kitchen line, kharkiv",
  },
  {
    id: "directrelief",
    name: "Direct Relief",
    ein: "95-1831116",
    website: "https://www.directrelief.org",
    tag: "Recurring · Global",
    mission:
      "Medicine and supplies routed to community clinics in 90+ countries, including disaster response.",
    swatch: "#0d253d",
    swatch2: "#9b6829",
    photoCaption: "photo · supply pallet, los angeles",
  },
] as const;

/**
 * Returns a fresh shallow copy of the campaign list. Returning a copy (not
 * the underlying `readonly` array) prevents callers from accidentally
 * mutating the registry through array methods that exist on the prototype.
 */
export function getCampaigns(): Campaign[] {
  return CAMPAIGNS.map((campaign) => ({ ...campaign }));
}

export function getCampaignById(id: string): Campaign | undefined {
  const found = CAMPAIGNS.find((campaign) => campaign.id === id);
  return found ? { ...found } : undefined;
}

export function getCampaignByEin(ein: string): Campaign | undefined {
  const found = CAMPAIGNS.find((campaign) => campaign.ein === ein);
  return found ? { ...found } : undefined;
}

export function campaignHref(campaign: Campaign): string {
  return `/donate/${campaign.id}`;
}

export type { Campaign };
