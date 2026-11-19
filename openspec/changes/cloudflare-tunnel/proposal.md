# Cloudflare Tunnel for agent.trytir.com

## Problem
The OpenChamber instance on the VPS (150.241.230.228) is reachable only over SSH. Staff need HTTPS access at `agent.trytir.com`.

## Scope
Install `cloudflared` natively on the VPS (apt — no Docker per server policy), create a tunnel, route `agent.trytir.com` DNS to it, and serve the OpenChamber instance through it.

In scope:
- `cloudflared` install + tunnel create + `config.yml` (`agent.trytir.com -> http://localhost:3000`).
- DNS CNAME for `agent.trytir.com` to the tunnel.
- systemd service for the tunnel; OpenChamber started `api-only` on localhost with UI password.
- Verification: HTTPS 200 at `https://agent.trytir.com` with UI auth.

Out of scope: multi-user accounts (separate question), moving primary data (local stays primary until verified).

## Constraints
- Needs a Cloudflare API token with Tunnel + DNS edit on the trytir.com zone (secret, never in repo).
- OpenChamber binds localhost; external access only through the tunnel.

## Acceptance criteria
- [ ] `https://agent.trytir.com` serves the OpenChamber UI with auth.
- [ ] Tunnel + OpenChamber survive reboot (systemd enabled).
- [ ] `openspec change validate cloudflare-tunnel` passes.
