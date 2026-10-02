import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { AmountSelector } from "@/components/checkout/AmountSelector";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { DEMO_POLICY } from "@/lib/checkout/policy";

function asyncNoop(): Promise<void> {
  return Promise.resolve();
}

const demoProps = {
  campaignId: "pcrf",
  onSubmit: asyncNoop,
  policy: DEMO_POLICY,
};

describe("AmountSelector — allowCustom", () => {
  const props = {
    valueCents: 0,
    customMode: false,
    onValueChange: () => {},
    onCustomModeChange: () => {},
  };

  test("renders the Custom chip by default", () => {
    expect(renderToString(<AmountSelector {...props} />)).toContain("Custom");
  });

  test("hides the Custom chip and custom hint when allowCustom is false", () => {
    const html = renderToString(
      <AmountSelector {...props} allowCustom={false} presetsCents={[100, 200, 500]} />,
    );
    expect(html).not.toContain("Custom");
    expect(html).not.toContain("set a custom amount");
    expect(html).toContain(">5<");
  });
});

describe("CheckoutForm — demo policy", () => {
  test("shows demo presets and no Custom chip", () => {
    const html = renderToString(<CheckoutForm {...demoProps} />);
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
    expect(html).toContain(">5<");
    expect(html).not.toContain(">25<");
    expect(html).not.toContain("Custom");
  });

  test("does not collect an email", () => {
    const html = renderToString(<CheckoutForm {...demoProps} />);
    expect(html).not.toContain("Email for receipt");
    expect(html).not.toContain("donor-email");
  });

  test("CTA reads Send test donation", () => {
    const html = renderToString(<CheckoutForm {...demoProps} />);
    expect(html).toContain("Send test donation");
  });

  test("preselects $1 so the order summary is populated on first render", () => {
    const html = renderToString(<CheckoutForm {...demoProps} />);
    expect(html).not.toContain("Enter an amount to see the breakdown.");
    expect(html).toContain("$1.00");
    expect(html).not.toMatch(/disabled=""[^>]*type="submit"|type="submit"[^>]*disabled=""/);
  });

  test("order summary has no card processing row", () => {
    const html = renderToString(<CheckoutForm {...demoProps} />);
    expect(html).not.toContain("Card processing");
    expect(html).toContain("Eudaimonia routing fee");
  });
});
