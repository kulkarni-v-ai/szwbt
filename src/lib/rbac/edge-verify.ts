/**
 * Edge-Compatible Session Token Verification
 * Uses standard Web Crypto API so middleware runs seamlessly in any runtime.
 */

const SESSION_SECRET = process.env.SESSION_SECRET || "szwbt-2026-super-secure-production-secret-key-9281726";

function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifyTokenEdge(
  token: string
): Promise<{ userId: string; email: string; roles: string[]; permissions: string[] } | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signatureBase64] = parts;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const dataBytes = enc.encode(payloadBase64);
    const signatureBytes = base64UrlToUint8Array(signatureBase64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as any,
      dataBytes
    );

    if (!isValid) return null;

    let base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const payload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt && payload.expiresAt < now) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  } catch (err) {
    return null;
  }
}
