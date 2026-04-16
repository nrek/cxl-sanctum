/**
 * Classify an IP captured at heartbeat time.
 *
 * Heartbeats record `REMOTE_ADDR` — i.e. whatever the last hop the Django
 * view sees. In two situations that won't be the node's public IP:
 *   1. A reverse proxy / load balancer terminates the connection (loopback
 *      or the proxy's own private address arrives instead of the client).
 *   2. The managed node lives in the same VPC and uses private routing
 *      (the "hairpin" case we document in server/README.md).
 *
 * In both cases the column labelled "Public IP" can't faithfully show one,
 * so we render "PROXIED" instead of a misleading value.
 *
 * We never throw — a malformed or unexpected value falls through to "public"
 * so we never silently hide data.
 */

export type IpClassification = "missing" | "proxied" | "public";

function isLoopback(ip: string): boolean {
  if (ip === "::1") return true;
  return ip.startsWith("127.");
}

function isIpv4Private(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isIpv6PrivateOrLocal(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true;
  if (/^f[c-d][0-9a-f]{2}:/i.test(lower)) return true;
  return false;
}

export function classifyIp(ip: string | null | undefined): IpClassification {
  if (!ip) return "missing";
  const trimmed = ip.trim();
  if (!trimmed) return "missing";
  if (isLoopback(trimmed)) return "proxied";
  if (trimmed.includes(":")) {
    return isIpv6PrivateOrLocal(trimmed) ? "proxied" : "public";
  }
  return isIpv4Private(trimmed) ? "proxied" : "public";
}
