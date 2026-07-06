import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ApiError } from "../types/index.js";

/**
 * SSRF guard (Docs/02-TRD §7). The backend drives a headless browser at
 * user-supplied URLs, so every target must be validated BEFORE launch:
 *  - http/https only
 *  - no localhost / .local / metadata hostnames
 *  - hostname must not resolve to a private, loopback, link-local or
 *    otherwise reserved IP range (IPv4 + IPv6)
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function inCidr4(ip: number, base: string, maskBits: number): boolean {
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ip & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local + cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

export function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return PRIVATE_V4.some(([base, bits]) => inCidr4(n, base, bits));
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Normalize an IPv4-mapped address (::ffff:127.0.0.1)
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped?.[1]) return isPrivateIPv4(v4Mapped[1]);
  if (lower === "::" || lower === "::1") return true; // unspecified / loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // not an IP at all — treat as unsafe
}

/**
 * Validate a user-supplied URL. Throws ApiError(400, INVALID_URL | BLOCKED_URL).
 * Returns the parsed URL on success.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiError(400, "INVALID_URL", "That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError(400, "INVALID_URL", "Only http(s) URLs can be scanned.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new ApiError(400, "BLOCKED_URL", "Local and internal addresses can't be scanned.");
  }

  // Literal IP in the URL (strip IPv6 brackets)
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal)) {
    if (isPrivateIp(literal)) {
      throw new ApiError(400, "BLOCKED_URL", "Private or reserved IP addresses can't be scanned.");
    }
    return url;
  }

  // Resolve and check every address the hostname maps to
  try {
    const addrs = await lookup(hostname, { all: true, verbatim: true });
    if (addrs.length === 0) throw new Error("no addresses");
    for (const { address } of addrs) {
      if (isPrivateIp(address)) {
        throw new ApiError(400, "BLOCKED_URL", "That host resolves to a private address and can't be scanned.");
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, "INVALID_URL", "That host could not be resolved.");
  }

  return url;
}

/** Non-throwing variant for secondary fetches (e.g. image downloads). */
export async function isSafeUrl(rawUrl: string): Promise<boolean> {
  try {
    await assertSafeUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}
