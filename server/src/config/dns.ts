import dns from 'node:dns';

/**
 * Defensive DNS bootstrap.
 *
 * Some local environments (NordVPN's "Threat Protection", AdGuard, dnsmasq, or
 * a stale VPN adapter) inject `127.0.0.1` into Windows network adapters as a
 * "DNS forwarder". When the local resolver is not actually listening, Node's
 * c-ares picks up that 127.0.0.1 and every DNS query fails with
 * `ECONNREFUSED` — including the SRV lookup required by `mongodb+srv://` URIs.
 *
 * This module:
 *   1. If `DNS_SERVERS` env (CSV) is set, applies those servers verbatim.
 *   2. Otherwise, if Node's auto-detected resolvers look broken (only
 *      localhost or empty), falls back to Cloudflare + Google public DNS.
 *
 * Must be imported FIRST in `src/index.ts`, before any module that performs
 * network resolution.
 */

const PUBLIC_FALLBACK = ['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4'];

function isObviouslyBroken(servers: readonly string[]): boolean {
  if (servers.length === 0) return true;
  return servers.every((s) => s === '127.0.0.1' || s === '::1' || s.startsWith('127.'));
}

export function bootstrapDns(): void {
  const fromEnv = process.env.DNS_SERVERS
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv && fromEnv.length > 0) {
    dns.setServers(fromEnv);
    console.warn(`[dns] using DNS_SERVERS from env: ${fromEnv.join(', ')}`);
    return;
  }

  const current = dns.getServers();
  if (isObviouslyBroken(current)) {
    dns.setServers(PUBLIC_FALLBACK);
    console.warn(
      `[dns] system DNS looks broken (${current.join(', ') || '<empty>'}) — ` +
        `falling back to public DNS: ${PUBLIC_FALLBACK.join(', ')}. ` +
        `Set DNS_SERVERS in .env to override.`,
    );
  }
}

bootstrapDns();
