# Discord Music Bot

A modern, powerful Discord music bot using discord.js v14 + Lavalink. Supports prefix commands (`?`) and slash commands, multi-server playback, autoplay, queue management, and Spotify/YouTube/SoundCloud sources.

## Run & Operate

- `pnpm --filter @workspace/discord-bot run dev` — start the Discord bot
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- Required secrets: `DISCORD_TOKEN`, `LAVALINK_PASSWORD`
- Required env vars (set): `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_SECURE`, `CLIENT_ID`, `PREFIX`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Bot: discord.js v14, lavalink-client v2
- Audio: Lavalink (hosted on Railway)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Keep-alive: Express HTTP server on PORT

## Where things live

- `artifacts/discord-bot/src/` — all bot source code
- `artifacts/discord-bot/src/commands/` — music & utility commands (auto-loaded)
- `artifacts/discord-bot/src/events/` — Discord client events (auto-loaded)
- `artifacts/discord-bot/src/handlers/` — command, event, and Lavalink loaders
- `artifacts/discord-bot/src/music/MusicManager.js` — search, play, autoplay logic
- `artifacts/discord-bot/src/lavalink/LavalinkClient.js` — Lavalink node setup
- `artifacts/discord-bot/src/utils/` — logger, embeds, cooldown, error handler, keep-alive
- `artifacts/discord-bot/application.yml` — Lavalink server config (for self-hosting)
- `artifacts/discord-bot/Dockerfile` + `railway.json` — Railway deploy config

## Architecture decisions

- lavalink-client v2 `nodeManager` must have an explicit `error` listener or Node.js throws `ERR_UNHANDLED_ERROR` and crashes the process — added in LavalinkClient.js
- Both prefix commands (`?`) and slash commands are unified: each command file handles both via `ctx.isChatInputCommand?.()`
- `closeOnError: false` + `retryAmount: 20` keeps the Lavalink manager alive through temporary server outages
- Keep-alive Express server listens on `PORT` (default 3000) to prevent Replit sleeping
- Discord `ready` event was renamed to `clientReady` in discord.js v14 (v15 will drop `ready`)
- Replit has no IPv6 routing — `dns.lookup` is patched to `family:4` in `index.js` so the `ws` library never tries IPv6 (Happy Eyeballs would otherwise fire ETIMEDOUT on IPv6 before IPv4 can connect). Using a bare IP instead of hostname breaks TLS SNI.

## Product

Music bot with: `?play`, `?stop`, `?skip`, `?join`, `?leave`, `?queue`, `?nowplaying`, `?volume`, `?autoplay`, `?ping` — plus slash command equivalents. Voice channel status shows current song like Spotify. Autoplay picks related tracks when queue ends.

## User preferences

- Prefix: `?`
- Lavalink host: `lava-v4.ajieblogs.eu.org` (public, port 443, secure)

## Gotchas

- After adding new secrets, restart the Discord Music Bot workflow
- Slash commands take up to 1 hour to propagate globally; set `GUILD_ID` for instant dev testing
- lavalink-client v2 emits `nodeError` on the `LavalinkManager` BUT also emits raw `error` on `NodeManager` — both need listeners
- `application.yml` is for self-hosting Lavalink — not needed when using the Railway-hosted instance

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
