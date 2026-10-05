import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ProcessingScreen } from "@/components/processing/ProcessingScreen";
import { buildLiveStages } from "@/lib/onramp/live-stages";
import type { ProcessingView } from "@/lib/onramp/processing-view";

const view: ProcessingView = {
  sessionId: "cos_test_123",
  amountDisplay: "5.00",
  grossCents: 500,
  charityName: "Palestine Children's Relief Fund",
  charityInitials: "PC",
  ein: "93-1057665",
  donorEmailMasked: "m***@protonmail.com",
  startedAt: "5:34:01 PM UTC · May 21, 2026",
};

function render(currentStage = 2) {
  const stages = buildLiveStages({ currentStage, grossCents: view.grossCents });
  return renderToString(
    <ProcessingScreen view={view} stages={stages} currentStage={currentStage} />,
  );
}

describe("ProcessingScreen — hero", () => {
  test("shows the live status pill and step eyebrow", () => {
    const html = render(2);
    expect(html).toContain("Settling on Base");
    expect(html).toContain("In progress · Step 2 of 5");
  });

  test("shows the amount + charity headline and subhead", () => {
    const html = render();
    expect(html).toContain("5.00");
    expect(html).toContain("Palestine Children&#x27;s Relief Fund");
    expect(html).toContain("Usually 6–12 seconds");
    expect(html).toContain("You can close this tab");
  });

  test("shows the charity anchor chip with EIN", () => {
    const html = render();
    expect(html).toContain("EIN 93-1057665 · 501(c)(3)");
  });
});

describe("ProcessingScreen — failed state hero", () => {
  test("swaps the live pill + eyebrow for interrupted copy", () => {
    const stages = buildLiveStages({
      currentStage: 2,
      failedAt: 2,
      grossCents: view.grossCents,
    });
    const html = renderToString(
      <ProcessingScreen view={view} stages={stages} currentStage={2} isFailed />,
    );
    expect(html).toContain("Interrupted at step 2 of 5");
    expect(html).toContain("Interrupted");
    expect(html).not.toContain("Settling on Base");
    expect(html).not.toContain("In progress · Step");
  });
});

describe("ProcessingScreen — tracker section", () => {
  test("renders the section heading and live label", () => {
    const html = render();
    expect(html).toContain("The path");
    expect(html).toContain("Where your dollar is, right now.");
    expect(html).toContain("Live · refreshing on-chain");
  });
});

describe("ProcessingScreen — stay-informed card", () => {
  test("renders the email-resume copy with the masked address", () => {
    const html = render();
    expect(html).toContain("If you have to go");
    expect(html).toContain("We’ll email you the receipt when it’s ready.");
    expect(html).toContain("Closing this tab won’t cancel the donation.");
    expect(html).toContain("m***@protonmail.com");
  });
});

describe("ProcessingScreen — skeleton receipt preview", () => {
  test("renders the coming-up heading, placeholders and network", () => {
    const html = render();
    expect(html).toContain("Coming up");
    expect(html).toContain("Your shareable receipt.");
    expect(html).toContain("Transaction hash");
    expect(html).toContain("Receipt URL appears once published");
    expect(html).toContain("Awaiting confirmations");
    expect(html).toContain("Base");
    expect(html).toContain("Ethereum L2");
  });

  test("renders the pre-settlement fee-disclosure strip", () => {
    const html = render();
    expect(html).toContain("Donor paid");
    expect(html).toContain("Eudaimonia fee");
    expect(html).toContain("Endaoment fee");
    expect(html).toContain("Charity will receive");
    expect(html).toContain("4.876");
  });
});

describe("ProcessingScreen — footer", () => {
  test("renders the wordmark links and session id", () => {
    const html = render();
    expect(html).toContain("What is Eudaimonia?");
    expect(html).toContain("Report a problem");
    expect(html).toContain("cos_test_123");
    expect(html).toContain("non-custodial donation router");
  });
});

describe("ProcessingScreen — footer links (MVP)", () => {
  test("has no dead # links", () => {
    const html = render();
    expect(html).not.toContain('href="#"');
    expect(html).toContain('href="/#how-it-works"');
    expect(html).toContain("https://github.com/mnkprs/Eudaimonia/issues");
  });
});
