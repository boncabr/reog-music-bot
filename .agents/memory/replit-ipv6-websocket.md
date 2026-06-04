---
name: Replit IPv6 + WebSocket ETIMEDOUT
description: Replit has no IPv6 routing — ws library Happy Eyeballs fires ETIMEDOUT on IPv6 before falling back to IPv4, breaking WebSocket connections to dual-stack hosts
---

## Rule
Patch `dns.lookup` at the very top of `index.js` (before any other imports) to force IPv4-only resolution:

```js
const dns = require('dns');
const _origLookup = dns.lookup.bind(dns);
dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (typeof options === 'number') { options = { family: 4 }; }
  else { options = Object.assign({}, options, { family: 4 }); }
  return _origLookup(hostname, options, callback);
};
```

Also set `--dns-result-order=ipv4first` in the npm dev/start scripts as a belt-and-suspenders fallback.

**Why:** Replit containers have no IPv6 network routes. When a host has both AAAA and A records (dual-stack), the `ws` npm library uses Happy Eyeballs — it fires connection attempts to IPv6 and IPv4 in parallel. The IPv6 attempt gets an immediate ETIMEDOUT (ENETUNREACH wrapped), which emits an `error` event before the IPv4 connection can succeed. This breaks WebSocket-based clients (lavalink-client, socket.io, etc.). `--dns-result-order=ipv4first` alone is NOT enough because it only reorders results — Happy Eyeballs still tries all addresses. Patching `dns.lookup` with `{family: 4}` ensures only IPv4 addresses are ever returned.

**How to apply:** Any bot or service on Replit that opens WebSocket connections to dual-stack external hosts (Discord voice, Lavalink, etc.) needs this patch at process startup.

**Note:** Do NOT use bare IP address instead of hostname — that breaks TLS SNI (SSL alert 112 `unrecognized_name`). Always use the hostname with the dns.lookup patch.
