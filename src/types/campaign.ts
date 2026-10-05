/**
 * Build-time, immutable registry data for a curated donation campaign.
 *
 * Live values (raised totals, donor counts, receipt counts) are intentionally
 * NOT part of this type — they come from on-chain reads in Epic 6, not from
 * the registry. Conflating them here would risk shipping fake hardcoded stats
 * to a brand whose entire thesis is transparency.
 */
export interface Campaign {
  /** URL slug, e.g. "pcrf". Stable identifier for routes and lookups. */
  id: string;
  /** Public-facing charity name. */
  name: string;
  /**
   * US IRS Employer Identification Number, format "NN-NNNNNNN". This is the
   * chain-agnostic key the Endaoment org address map and metadata snapshot are
   * keyed by (see `src/lib/endaoment/orgs.ts`); the per-chain org address lives
   * there, not on the campaign.
   */
  ein: string;
  /** The charity's own website, linked from the receipt's "Visit charity". */
  website: string;
  /** Short status pill, e.g. "Urgent · Gaza". */
  tag: string;
  /** 1–2 sentence mission statement shown on the campaign card. */
  mission: string;
  /** Primary accent color for the card's placeholder visual. */
  swatch: string;
  /** Secondary tint paired with `swatch`. */
  swatch2: string;
  /** Lowercase descriptive caption for the placeholder image, e.g. "photo · field clinic, rafah". */
  photoCaption: string;
}
