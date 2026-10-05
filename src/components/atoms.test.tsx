import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { PhiMark } from "@/components/brand/PhiMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { CopyButton } from "@/components/ui/CopyButton";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { Num } from "@/components/ui/Num";
import { VerifyLink } from "@/components/ui/VerifyLink";
import { colors } from "@/lib/tokens";

describe("brand atoms", () => {
  test("PhiMark renders an svg with the requested size and ink stroke by default", () => {
    const html = renderToString(<PhiMark />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="22"');
    expect(html).toContain('height="22"');
    expect(html).toContain(colors.ink);
    expect(html).toContain('aria-hidden="true"');
  });

  test("PhiMark honors custom size and color props", () => {
    const html = renderToString(<PhiMark size={32} color="#abcdef" />);
    expect(html).toContain('width="32"');
    expect(html).toContain('height="32"');
    expect(html).toContain("#abcdef");
  });

  test("Wordmark renders the Eudaimonia word alongside the mark", () => {
    const html = renderToString(<Wordmark />);
    expect(html).toContain("Eudaimonia");
    expect(html).toContain("<svg");
  });
});

describe("ui atoms", () => {
  test("CopyButton renders the provided label", () => {
    const html = renderToString(<CopyButton value="0xdead" label="Copy hash" />);
    expect(html).toContain("Copy hash");
    expect(html).toContain("<button");
  });

  test("CopyButton uses 'Copy' as the default label", () => {
    const html = renderToString(<CopyButton value="0xdead" />);
    expect(html).toContain("Copy");
  });

  test("VerifyLink renders an anchor with the default BaseScan label and inline svg chevron", () => {
    const html = renderToString(<VerifyLink href="https://basescan.org/tx/0x1" />);
    expect(html).toContain("<a");
    expect(html).toContain("Verify on BaseScan");
    expect(html).toContain("<svg");
  });

  test("Mono renders its children inside a monospace span", () => {
    const html = renderToString(<Mono>0xdc67…78ed</Mono>);
    expect(html).toContain("<span");
    expect(html).toContain("0xdc67…78ed");
    expect(html.toLowerCase()).toContain("monospace");
  });

  test("Num renders its children with tabular-figure styling", () => {
    const html = renderToString(<Num>1,234</Num>);
    expect(html).toContain("1,234");
    expect(html).toContain("tnum");
  });

  test("EyebrowLabel renders uppercase children", () => {
    const html = renderToString(<EyebrowLabel>Donor</EyebrowLabel>);
    expect(html).toContain("Donor");
    expect(html.toLowerCase()).toContain("uppercase");
  });
});
