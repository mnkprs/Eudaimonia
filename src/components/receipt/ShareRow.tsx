"use client";

import { useState, type ReactNode } from "react";

import { trackShared, type ShareChannel } from "@/lib/analytics/events";
import { colors } from "@/lib/tokens";

interface ShareRowProps {
  /** URL to share. Falls back to the current page on the client. */
  shareUrl?: string;
  /** Plain-text message used for Twitter/WhatsApp share intents. */
  shareText?: string;
}

export function ShareRow({
  shareUrl,
  shareText = "Verified donation receipt on Eudaimonia.",
}: ShareRowProps) {
  // Shares must carry the receipt link; the receipt only renders client-side,
  // so the current page URL is the receipt URL when none is passed.
  const url =
    shareUrl ?? (typeof window !== "undefined" ? window.location.href : undefined);
  return (
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "8px 64px 88px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "32px 0",
          borderTop: `1px solid ${colors.hairline}`,
          borderBottom: `1px solid ${colors.hairline}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: "-0.22px",
              color: colors.ink,
            }}
          >
            Share this receipt
          </div>
          <div
            style={{
              fontSize: 13,
              color: colors.inkMute,
              marginTop: 4,
              letterSpacing: "-0.1px",
            }}
          >
            Anyone with the link can verify it. We don&rsquo;t track who opens it.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <CopyLinkButton shareUrl={url} />
          <ShareIntentButton
            label="Twitter"
            channel="twitter"
            href={twitterIntent(shareText, url)}
            icon={<TwitterIcon />}
          />
          <ShareIntentButton
            label="WhatsApp"
            channel="whatsapp"
            href={whatsappIntent(shareText, url)}
            icon={<WhatsAppIcon />}
          />
        </div>
      </div>
    </section>
  );
}

interface CopyLinkButtonProps {
  shareUrl?: string;
}

function CopyLinkButton({ shareUrl }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const target =
      shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      trackShared("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission denied or unsupported — fail silent for now.
      // TODO(eudaimonia): wire a toast/error state once the design system has one.
    }
  }

  return (
    <ChipButton primary onClick={handleCopy} icon={<LinkIcon />}>
      {copied ? "Copied" : "Copy link"}
    </ChipButton>
  );
}

interface ShareIntentButtonProps {
  label: string;
  channel: ShareChannel;
  href: string;
  icon: ReactNode;
}

function ShareIntentButton({ label, channel, href, icon }: ShareIntentButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackShared(channel)}
      style={chipStyle(false)}
    >
      {icon}
      {label}
    </a>
  );
}

interface ChipButtonProps {
  primary?: boolean;
  onClick?: () => void;
  icon: ReactNode;
  children: ReactNode;
}

function ChipButton({ primary = false, onClick, icon, children }: ChipButtonProps) {
  return (
    <button type="button" onClick={onClick} style={chipStyle(primary)}>
      {icon}
      {children}
    </button>
  );
}

function chipStyle(primary: boolean): React.CSSProperties {
  return {
    appearance: "none",
    border: primary ? "none" : `1px solid ${colors.hairline}`,
    background: primary ? colors.ink : colors.canvas,
    color: primary ? colors.canvas : colors.ink,
    fontSize: 14,
    fontWeight: 400,
    fontFamily: "inherit",
    letterSpacing: "-0.1px",
    padding: "10px 18px",
    borderRadius: 9999,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    transition: "all .15s",
  };
}

function twitterIntent(text: string, url?: string): string {
  const params = new URLSearchParams({ text });
  if (url) params.set("url", url);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function whatsappIntent(text: string, url?: string): string {
  const message = url ? `${text} ${url}` : text;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M5.5 8.5L8.5 5.5M6 3L7.5 1.5C8.5 0.5 10.1 0.5 11.1 1.5L12.5 2.9C13.5 3.9 13.5 5.5 12.5 6.5L11 8M8 11L6.5 12.5C5.5 13.5 3.9 13.5 2.9 12.5L1.5 11.1C0.5 10.1 0.5 8.5 1.5 7.5L3 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M10.5 1H12.7L8 6.4L13.5 13H9.2L5.8 8.6L1.9 13H-0.3L4.7 7.2L-0.5 1H3.9L7 5L10.5 1ZM9.7 11.7H10.9L3.4 2.2H2.1L9.7 11.7Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 0.5C3.4 0.5 0.5 3.4 0.5 7C0.5 8.2 0.8 9.3 1.4 10.3L0.5 13.5L3.8 12.6C4.7 13.1 5.8 13.4 7 13.4C10.6 13.4 13.5 10.5 13.5 6.9C13.5 3.3 10.6 0.5 7 0.5Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M4.5 4.5C4.5 4.5 5 4 5.5 4.5C6 5 6.2 5.5 6 6C5.8 6.5 5.5 6.5 5.8 7C6.1 7.5 6.5 7.9 7 8.2C7.5 8.5 7.5 8.2 8 8C8.5 7.8 9 8 9.5 8.5C10 9 9.5 9.5 9 9.7C8.5 9.9 7 9.5 5.5 8C4 6.5 4.3 5 4.5 4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
