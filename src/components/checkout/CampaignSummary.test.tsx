import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CampaignSummary } from "@/components/checkout/CampaignSummary";
import type { Campaign } from "@/types/campaign";

const sampleCampaign: Campaign = {
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
};

describe("CampaignSummary", () => {
  test("renders campaign name", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain("Palestine Children");
    expect(html).toContain("Relief Fund");
  });

  test("renders the mission statement", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain("Medical aid, trauma care");
  });

  test("renders the tag pill text", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain("Urgent");
    expect(html).toContain("Gaza");
  });

  test("renders the EIN with 501(c)(3) Endaoment attribution", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain("EIN 93-1057665");
    expect(html).toContain("501(c)(3)");
    expect(html).toContain("Endaoment");
  });

  test("renders campaign initials inside the gradient badge", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain(">PC<");
  });

  test("renders <StripedPlaceholder> as the campaign photo", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="photo · field clinic, rafah"');
  });

  test("gradient badge embeds swatch hex values in inline style", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain("c14040");
    expect(html).toContain("f5e9d4");
    expect(html).toContain("linear-gradient");
  });

  test("uses Tailwind utility classes for card chrome", () => {
    const html = renderToString(<CampaignSummary campaign={sampleCampaign} />);
    expect(html).toContain("border-rule");
    expect(html).toContain("rounded");
  });

  test("derives initials from a multi-word campaign name", () => {
    const html = renderToString(
      <CampaignSummary
        campaign={{ ...sampleCampaign, name: "World Central Kitchen" }}
      />,
    );
    expect(html).toContain(">WC<");
  });

  test("falls back to first two letters for a single-word campaign name", () => {
    const html = renderToString(
      <CampaignSummary
        campaign={{ ...sampleCampaign, name: "Oxfam" }}
      />,
    );
    expect(html).toContain(">OX<");
  });
});
