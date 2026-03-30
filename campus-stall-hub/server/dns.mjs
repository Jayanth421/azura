import dns from 'node:dns'
import { DNS_SERVERS } from './env.mjs'

function splitServers(raw) {
  return String(raw ?? '')
    .split(/[,\s]+/g)
    .map((server) => server.trim())
    .filter(Boolean)
}

export function configureDns() {
  const servers = splitServers(DNS_SERVERS)
  if (servers.length === 0) return { configured: false, servers: [] }

  try {
    dns.setServers(servers)
  } catch (err) {
    console.warn(`[dns] failed to apply DNS_SERVERS: ${err?.message || err}`)
    return { configured: false, servers: [] }
  }

  return { configured: true, servers }
}

