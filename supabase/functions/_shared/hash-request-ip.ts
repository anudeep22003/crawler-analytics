import { isIP } from "node:net";

const CLIENT_IP_HEADER = "cf-connecting-ip";
const FALLBACK_IP_HEADER = "x-real-ip";
const HASH_ALGORITHM = "SHA-256";
const IPV6_VERSION = 6;
const HEX_BASE = 16;
const HEX_BYTE_WIDTH = 2;
const HEX_PADDING = "0";

export async function hashRequestIp(headers: Headers): Promise<string | null> {
  // These are gateway metadata, not authenticated identity. Do not guess which
  // entry in an arbitrary X-Forwarded-For chain belongs to the original visitor.
  const value =
    headers.get(CLIENT_IP_HEADER) ?? headers.get(FALLBACK_IP_HEADER);
  const address = value?.trim();
  if (!address) return null;

  const version = isIP(address);
  if (!version) return null;

  // Canonicalize equivalent IPv6 spellings before hashing. Never persist raw IPs.
  let normalizedAddress = address;
  if (version === IPV6_VERSION) {
    try {
      normalizedAddress = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    } catch {
      // Interface-scoped IPv6 addresses are not usable public visitor addresses.
      return null;
    }
  }
  const digest = await crypto.subtle.digest(
    HASH_ALGORITHM,
    new TextEncoder().encode(normalizedAddress),
  );

  // Deliberately unkeyed for v1; see docs/improvements.md for the HMAC upgrade.
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEX_BASE).padStart(HEX_BYTE_WIDTH, HEX_PADDING),
  ).join("");
}
