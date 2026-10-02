const NOTICE_CLASSES =
  "mb-6 flex items-start gap-3 rounded-lg border border-rule bg-iris-bg px-4 py-3";
const PILL_CLASSES =
  "mt-0.5 inline-flex shrink-0 items-center rounded-sm bg-iris px-2 py-0.5 text-[10px] font-normal uppercase tracking-[0.12em] text-white";
const COPY_CLASSES = "text-[13px] font-light tracking-[-0.1px] text-ink";
const COPY_STRONG_CLASSES = "font-normal";

/** Compact banner at the top of the testnet demo checkout. */
export function DemoNotice() {
  return (
    <div role="status" className={NOTICE_CLASSES}>
      <span className={PILL_CLASSES}>TESTNET</span>
      <p className={COPY_CLASSES}>
        <span className={COPY_STRONG_CLASSES}>
          Testnet demo — no real money.
        </span>{" "}
        Donations send test USDC on Base Sepolia to testnet stand-in charity
        contracts.
      </p>
    </div>
  );
}
