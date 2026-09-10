/** A display/navigation guard only. The backend still verifies each JWT's
 * signature, expiry and revocation before allowing protected operations. */
export function isExpiredJwt(token: string | null): boolean {
  if (!token) return true;
  const payload = token.split(".")[1];
  if (!payload) return true;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const { exp } = JSON.parse(decoded) as { exp?: unknown };
    return typeof exp !== "number" || exp * 1_000 <= Date.now();
  } catch {
    // Valid TunaBank login tokens always have an expiry. A malformed stored
    // value cannot unlock a page while waiting for server-side verification.
    return true;
  }
}
