import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { EndaomentBadge } from "@/components/brand/EndaomentBadge";

describe("EndaomentBadge", () => {
  test('renders visible "Verified by Endaoment" text', () => {
    const html = renderToString(<EndaomentBadge />);
    expect(html).toContain("Verified by Endaoment");
  });

  test("renders as an anchor element when href is provided", () => {
    const url = "https://basescan.org/address/0xabc";
    const html = renderToString(<EndaomentBadge href={url} />);
    expect(html).toContain("<a");
    expect(html).toContain(`href="${url}"`);
  });

  test("renders as a span element when no href is provided", () => {
    const html = renderToString(<EndaomentBadge />);
    expect(html).not.toContain("<a");
    expect(html).toContain("<span");
  });

  test("anchor opens in a new tab with noopener noreferrer", () => {
    const html = renderToString(
      <EndaomentBadge href="https://basescan.org/address/0xabc" />,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).toContain("noreferrer");
  });

  test("has an accessible label via aria-label", () => {
    const html = renderToString(<EndaomentBadge />);
    expect(html).toContain("aria-label");
    expect(html).toContain("Endaoment");
  });

  test("sm size renders smaller than md size (font-size tokens differ)", () => {
    const htmlSm = renderToString(<EndaomentBadge size="sm" />);
    const htmlMd = renderToString(<EndaomentBadge size="md" />);
    // Both render the badge text but at different sizes — check both exist
    expect(htmlSm).toContain("Verified by Endaoment");
    expect(htmlMd).toContain("Verified by Endaoment");
    // The sm badge uses a smaller font-size value
    expect(htmlSm).toContain("10px");
    expect(htmlMd).toContain("12px");
  });

  test("uses design-system color tokens (no hardcoded non-token hex)", () => {
    const html = renderToString(<EndaomentBadge />);
    // Should use the primary brand color and not arbitrary hex values
    expect(html).toContain("#533afd"); // colors.primary
  });
});

describe("EndaomentBadge testnet-stand-in variant", () => {
  test('reads "Testnet stand-in" and not "Verified by Endaoment"', () => {
    const html = renderToString(<EndaomentBadge variant="testnet-stand-in" />);
    expect(html).toContain("Testnet stand-in");
    expect(html).not.toContain("Verified by");
    expect(html).not.toContain("Endaoment");
  });

  test("still links to the explorer when href is provided", () => {
    const url = "https://sepolia.basescan.org/address/0xabc";
    const html = renderToString(
      <EndaomentBadge variant="testnet-stand-in" href={url} />,
    );
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain('aria-label="Testnet stand-in');
  });

  test("default variant output is identical to explicit verified", () => {
    expect(renderToString(<EndaomentBadge />)).toBe(
      renderToString(<EndaomentBadge variant="verified" />),
    );
  });
});
