# Obsidian Vault Extension

## Problem
Every project needs a durable memory: decisions, todos, plans, and domain notes that both the agent and staff can read and update. Today that knowledge lives only in chat history, which is neither browsable nor searchable.

## Scope
Build an OpenChamber extension (`@chamby/obsidian-vault`) in this repo that, when a project is created, scaffolds an Obsidian vault at `<repo>/obsidian/` and keeps it updated from agent activity.

In scope:
- Vault scaffold: `obsidian/` folder, `.obsidian/app.json`, `.obsidian/community-plugins.json`, `.obsidian/core-plugins.json` with a fixed plugin set enabled.
- Preinstalled community plugins (pinned versions, files vendored in repo): `analogy-rag-in-your-vault` (semantic search + MCP), `self-hosted-livesync` (sync transport, configured but inert until user adds a backend).
- A notes skill (`skills/notes/SKILL.md`) defining what the agent records, note layout, and update triggers.
- A headless service (`service/`) subscribed to `sessionEvents` (`session-created`, `turn-finished` with content) that creates/updates notes without a window open.
- opencode access to vault semantic search via the Analogy MCP server where it runs.

Out of scope:
- Running Obsidian-the-app on the server (Electron GUI, cannot run headless; the server vault is a file store).
- LiveSync backend provisioning (CouchDB/R2 setup is a separate change).

## Constraints
- No Docker on the server. Everything is files + a Node service.
- Analogy's embedding runtime ships macOS (Apple Silicon) and Windows x64 only — no Linux runtime, free tier caps 2,500 markdown files, license check phones home. So server-side semantic search cannot depend on Analogy: Phase 1 uses Analogy MCP on desktops; the service exposes a `/search` HTTP endpoint backed by exact + keyword search, with a local-embedding upgrade path in Phase 2.
- Vault lives in the project repo, so git is the sync transport. Staff edit via Obsidian + LiveSync/R2; conflicts resolve in git.

## Acceptance criteria
- [ ] New project gets `obsidian/` with valid `.obsidian/` config on first session in a new directory.
- [ ] `community-plugins.json` enables the pinned set; plugin files present and load in desktop Obsidian with no errors.
- [ ] `turn-finished` events produce or update a note within the same project vault.
- [ ] opencode can query vault content semantically where Analogy runs, and via `/search` on the server.
- [ ] `openspec change validate obsidian-vault-extension` passes.
