/**
 * Identify the caller for rate limiting. Behind Vercel/proxies the real client
 * is the FIRST hop in `x-forwarded-for`; fall back to `x-real-ip`, then a shared
 * "unknown" bucket (so spoofed/absent headers can't dodge the limit entirely).
 */
export function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
