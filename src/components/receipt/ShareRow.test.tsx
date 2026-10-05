import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ShareRow } from "@/components/receipt/ShareRow";

const URL_ = "https://eudaimonia-nine.vercel.app/receipt/0xabc";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ShareRow", () => {
  test("Twitter and WhatsApp intents include an explicit share URL", () => {
    const html = renderToString(<ShareRow shareUrl={URL_} />);
    expect(html).toContain(encodeURIComponent(URL_));
  });

  test("falls back to the current page URL so shares always carry the receipt link", () => {
    vi.stubGlobal("window", { location: { href: URL_ } });
    const html = renderToString(<ShareRow />);
    expect(html).toContain(encodeURIComponent(URL_));
  });
});
