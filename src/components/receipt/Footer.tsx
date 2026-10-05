import { Wordmark } from "@/components/brand/Wordmark";
import { isTestnetNetwork } from "@/lib/chain";
import { SOURCE_REPO_URL } from "@/lib/links";
import { colors } from "@/lib/tokens";
import type { Network } from "@/types/receipt";

const MAINNET_DISCLAIMER =
  "Eudaimonia is a non-custodial donation router. Donations are tax-deductible to the extent allowed by law, processed through Endaoment Inc. (EIN 84-3104578). This receipt is generated from on-chain data and is verifiable independently.";

const TESTNET_DISCLAIMER =
  "Demo receipt: test USDC on Base Sepolia, so no real money moved and this is not tax-deductible. Charity contracts here are testnet stand-ins, not affiliated with Endaoment.";

interface FooterProps {
  /** Network the receipt settled on; Base Sepolia swaps in the testnet disclosure. */
  network?: Network;
}

export function Footer({ network = "Base" }: FooterProps) {
  return (
    <footer style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 64px 72px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.inkMute,
          fontSize: 13,
          letterSpacing: "-0.1px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Wordmark size={13} color={colors.inkMute} />
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <FooterLink href="/" emphasis>
            What is Eudaimonia? →
          </FooterLink>
          <FooterLink href="/fee-policy">How fees work</FooterLink>
          <FooterLink href={SOURCE_REPO_URL}>Source code</FooterLink>
        </div>
      </div>
      <p
        style={{
          marginTop: 18,
          marginBottom: 0,
          fontSize: 11,
          color: colors.inkMute,
          letterSpacing: "-0.1px",
          maxWidth: 720,
          lineHeight: 1.5,
        }}
      >
        {isTestnetNetwork(network) ? TESTNET_DISCLAIMER : MAINNET_DISCLAIMER}
      </p>
    </footer>
  );
}

interface FooterLinkProps {
  href: string;
  emphasis?: boolean;
  children: React.ReactNode;
}

function FooterLink({ href, emphasis = false, children }: FooterLinkProps) {
  return (
    <a
      href={href}
      style={{
        color: emphasis ? colors.primary : colors.inkMute,
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}
