import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { MeaningsCard } from "@/components/landing/MeaningsCard";

describe("MeaningsCard", () => {
  test("renders the /pronounce header label", () => {
    const html = renderToString(<MeaningsCard />);
    expect(html).toContain("/pronounce");
  });

  test("server-renders the initial English face", () => {
    const html = renderToString(<MeaningsCard />);
    expect(html).toContain("Eudaimonia");
    expect(html).toContain("A donation platform");
  });

  test("renders a four-step pager-dot timeline", () => {
    const html = renderToString(<MeaningsCard />);
    const dots = html.split("data-pager-dot").length - 1;
    expect(dots).toBe(4);
  });

  test("renders the fixed IPA footer with real unicode, not escape sequences", () => {
    const html = renderToString(<MeaningsCard />);
    expect(html).toContain("[eu̯dai̯moníaː]");
    // The prototype bug rendered "̯" literally; real unicode never
    // surfaces the ASCII escape text, so its absence proves the fix.
    expect(html).not.toContain("u032F");
    expect(html).not.toContain("u00ED");
  });

  test('MVP: no inactive "hear it" audio button', () => {
    const html = renderToString(<MeaningsCard />);
    expect(html).not.toContain("hear it");
  });
});
