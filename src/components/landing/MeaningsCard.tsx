"use client";

import { useEffect, useState } from "react";

import { PhiMark } from "@/components/brand/PhiMark";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { colors } from "@/lib/tokens";

const IPA = "[eu̯dai̯moníaː]";

interface Face {
  eyebrow: string;
  big: string;
  sub: string;
  tone: string;
  fontFamily: string;
}

const FACES: readonly Face[] = [
  {
    eyebrow: "English",
    big: "Eudaimonia",
    sub: "A donation platform.",
    tone: colors.ink,
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  {
    eyebrow: "Greek",
    big: "εὐδαιμονία",
    sub: 'From εὖ (eu, "good") + δαίμων (daímōn, "spirit").',
    tone: colors.ink,
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    eyebrow: "IPA",
    big: IPA,
    sub: "A noun, spoken aloud.",
    tone: colors.ink,
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  },
  {
    eyebrow: "Translation",
    big: "Human flourishing.",
    sub: "The good life that comes from doing right by others.",
    tone: colors.primary,
    fontFamily: '"Inter", system-ui, sans-serif',
  },
];

const CYCLE_MS = 2600;

export function MeaningsCard() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % FACES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const face = FACES[index];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-rule bg-white p-7"
      style={{
        minHeight: 340,
        boxShadow:
          "0 14px 40px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)",
      }}
    >
      <div className="mb-4 flex items-center justify-between border-b border-rule-soft pb-3.5">
        <div className="flex items-center gap-2.5">
          <PhiMark size={18} />
          <Mono size={11} color={colors.inkMute}>
            /pronounce
          </Mono>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {FACES.map((f, i) => (
            <span
              key={f.eyebrow}
              data-pager-dot
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 9999,
                background: i === index ? colors.primary : colors.hairline,
                transition: "all .4s ease",
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <EyebrowLabel color={colors.primary}>{face.eyebrow}</EyebrowLabel>
        <div
          style={{
            marginTop: 14,
            fontSize: face.big.length > 18 ? 36 : 48,
            fontWeight: 300,
            letterSpacing: face.fontFamily.includes("Mono") ? "-0.5px" : "-1.4px",
            color: face.tone,
            lineHeight: 1.05,
            fontFamily: face.fontFamily,
            fontFeatureSettings: '"ss01"',
            textWrap: "pretty",
          }}
        >
          {face.big}
        </div>
        <p
          style={{
            margin: "18px 0 0",
            fontSize: 15,
            lineHeight: 1.5,
            color: colors.inkMute,
            letterSpacing: "-0.1px",
            maxWidth: 360,
          }}
        >
          {face.sub}
        </p>
      </div>

      <div className="absolute inset-x-7 bottom-[22px] flex items-center justify-between border-t border-rule-soft pt-3.5">
        <Mono size={12} color={colors.inkMute}>
          {IPA}
        </Mono>
      </div>
    </div>
  );
}
