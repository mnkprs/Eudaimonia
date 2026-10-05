"use client";

import { useState, type CSSProperties } from "react";

import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { Num } from "@/components/ui/Num";
import { VerifyLink } from "@/components/ui/VerifyLink";
import { deriveLogUrl } from "@/lib/explorer";
import { colors } from "@/lib/tokens";
import type { Hex, Stage } from "@/types/receipt";

type TrackerVariant = "card" | "minimal";

interface PizzaTrackerProps {
  stages: Stage[];
  variant?: TrackerVariant;
  /** Full transaction hash — when provided, each active stage's Verify link
   *  deep-links to the tx's event log on BaseScan. */
  txid?: Hex;
  /** Chain id (e.g. `base.id` or `baseSepolia.id`) — required alongside
   *  `txid` to construct the correct explorer URL. */
  chainId?: number;
}

export function PizzaTracker({
  stages,
  variant = "card",
  txid,
  chainId,
}: PizzaTrackerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const minimal = variant === "minimal";

  return (
    <section
      style={{
        padding: "32px 64px 88px",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 36,
        }}
      >
        <div>
          <EyebrowLabel>The path</EyebrowLabel>
          <h2
            style={{
              margin: "8px 0 0",
              fontSize: 26,
              fontWeight: 300,
              letterSpacing: "-0.26px",
              color: colors.ink,
            }}
          >
            Where the dollar went, step by step.
          </h2>
        </div>
        <div
          style={{
            fontSize: 13,
            color: colors.inkMute,
            letterSpacing: "-0.1px",
          }}
        >
          {`${stages.length} stops · six seconds end-to-end · all final.`}
        </div>
      </header>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
          gap: 8,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 18,
            left: "calc(10% + 8px)",
            right: "calc(10% + 8px)",
            height: 1,
            background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} 100%)`,
            opacity: 0.35,
            zIndex: 0,
          }}
        />

        {stages.map((stage, i) => (
          <StageColumn
            key={stage.n}
            stage={stage}
            index={i}
            isActive={activeIndex === i}
            minimal={minimal}
            txid={txid}
            chainId={chainId}
            onEnter={() => !stage.inactive && setActiveIndex(i)}
            onLeave={() => setActiveIndex(null)}
          />
        ))}
      </div>
    </section>
  );
}

interface StageColumnProps {
  stage: Stage;
  index: number;
  isActive: boolean;
  minimal: boolean;
  txid?: Hex;
  chainId?: number;
  onEnter: () => void;
  onLeave: () => void;
}

function StageColumn({
  stage,
  index,
  isActive,
  minimal,
  txid,
  chainId,
  onEnter,
  onLeave,
}: StageColumnProps) {
  const isFee = stage.fee === true;
  const isInactive = stage.inactive === true;
  // Stable id linking the focusable container to its fee tooltip so
  // keyboard/AT users get the same financial detail mouse users see on hover.
  const feeTipId = stage.feeOnHover ? `stage-${stage.n}-${index}-fee` : undefined;

  const cardStyle: CSSProperties = {
    background: minimal ? "transparent" : isActive ? colors.canvas : colors.surfaceMute,
    border: minimal
      ? "none"
      : isInactive
        ? `1px dashed ${colors.hairline}`
        : isActive
          ? `1px solid ${colors.hairline}`
          : `1px solid ${colors.hairlineMute}`,
    borderRadius: 12,
    padding: minimal ? "0 16px" : 16,
    transition: "all .18s",
    boxShadow:
      isActive && !minimal && !isInactive
        ? "0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)"
        : "none",
    minHeight: 220,
    opacity: isInactive ? 0.72 : 1,
  };

  return (
    <div
      tabIndex={0}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      aria-describedby={feeTipId}
      style={{
        position: "relative",
        cursor: isInactive ? "default" : "pointer",
        outline: "none",
      }}
    >
      <StageNode isActive={isActive} isFee={isFee} isInactive={isInactive} />
      <div style={cardStyle}>
        <StageHeader stage={stage} isInactive={isInactive} />
        <div
          style={{
            fontSize: 13,
            color: colors.inkMute,
            letterSpacing: "-0.1px",
            marginBottom: 14,
            minHeight: 36,
          }}
        >
          {stage.short}
        </div>

        {isInactive ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: colors.inkMute,
              letterSpacing: "-0.1px",
              fontStyle: "italic",
            }}
          >
            {stage.detail}
          </p>
        ) : (
          <StageBody
            stage={stage}
            isFee={isFee}
            isActive={isActive}
            txid={txid}
            chainId={chainId}
            feeTipId={feeTipId}
          />
        )}
      </div>
    </div>
  );
}

interface StageNodeProps {
  isActive: boolean;
  isFee: boolean;
  isInactive: boolean;
}

function StageNode({ isActive, isFee, isInactive }: StageNodeProps) {
  const ringColor = isFee ? colors.steel : colors.primary;
  const fillColor = isFee ? colors.inkDark : colors.primary;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        position: "relative",
        zIndex: 1,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9999,
          background: colors.canvas,
          border: isInactive ? `1px dashed ${colors.steel}` : `1px solid ${ringColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all .2s",
          boxShadow: isActive ? "0 0 0 6px rgba(83,58,253,0.10)" : "none",
        }}
      >
        {isInactive ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke={colors.steel}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          </svg>
        ) : (
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: fillColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1.5 4L3.3 5.7L6.5 2.5"
                stroke={colors.canvas}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

interface StageHeaderProps {
  stage: Stage;
  isInactive: boolean;
}

function StageHeader({ stage, isInactive }: StageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 6,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: "0.1em",
          color: colors.inkMute,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`0${stage.n}`}
      </span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 300,
          letterSpacing: "-0.2px",
          color: isInactive ? colors.inkMute : colors.ink,
        }}
      >
        {stage.title}
      </span>
      {isInactive && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: colors.inkMute,
            background: colors.canvas,
            border: `1px dashed ${colors.steel}`,
            borderRadius: 9999,
            padding: "2px 6px",
          }}
        >
          {stage.inactiveLabel ?? "Future"}
        </span>
      )}
    </div>
  );
}

interface StageBodyProps {
  stage: Stage;
  isFee: boolean;
  isActive: boolean;
  txid?: Hex;
  chainId?: number;
  /** Id linking the focusable stage to its fee tooltip via aria-describedby. */
  feeTipId?: string;
}

function StageBody({
  stage,
  isFee,
  isActive,
  txid,
  chainId,
  feeTipId,
}: StageBodyProps) {
  const verifyHref =
    txid !== undefined && chainId !== undefined
      ? deriveLogUrl(txid, chainId)
      : undefined;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginBottom: 10,
        }}
      >
        <Num size={22} weight={300} track="-0.4px" color={isFee ? colors.inkMute : colors.ink}>
          {isFee ? `−${stage.amount}` : stage.amount}
        </Num>
        <span
          style={{
            fontSize: 11,
            color: colors.inkMute,
            letterSpacing: "0.05em",
          }}
        >
          {stage.unit}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          paddingTop: 10,
          borderTop: `1px dashed ${colors.hairline}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: colors.inkMute,
          }}
        >
          <span>{stage.addressLabel}</span>
          <Mono size={11} color={colors.ink}>
            {stage.address}
          </Mono>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: colors.inkMute,
            fontFeatureSettings: '"tnum","ss01"',
          }}
        >
          <span>{stage.timestamp}</span>
          <span>{stage.relative}</span>
        </div>
        {stage.feeOnHover && isActive && (
          <div
            id={feeTipId}
            role="tooltip"
            style={{
              marginTop: 4,
              padding: "6px 8px",
              background: colors.surfaceTint,
              borderRadius: 6,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: colors.inkDeep,
              fontFeatureSettings: '"tnum","ss01"',
            }}
          >
            <span style={{ color: colors.inkMute }}>
              {stage.feeOnHover.label} (1.5%)
            </span>
            <span>−${stage.feeOnHover.amount}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <VerifyLink label="Verify ↗" href={verifyHref} />
      </div>
    </>
  );
}
