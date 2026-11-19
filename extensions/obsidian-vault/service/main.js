// Vault service: scaffolds per-project Obsidian vaults and records session
// activity as notes. No dependencies (node stdlib only). Runs headless.
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.dirname(HERE);
const VERSIONS = JSON.parse(fs.readFileSync(path.join(HERE, "versions.json"), "utf8")).pinned;
const PORT = Number(process.env.VAULT_SERVICE_PORT || 17813);
const TOKEN = process.env.VAULT_SERVICE_TOKEN || "";
const TEMPLATE = path.join(EXT, "vault-template");

const json = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

// download with redirect following (GitHub release URLs redirect)
function fetchTo(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "user-agent": "chamby-vault/0.1" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(fetchTo(res.headers.location, dest, redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`GET ${url} -> ${res.statusCode}`));
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => resolve());
      out.on("error", reject);
    }).on("error", reject);
  });
}

function copyTemplateFile(rel, destDir) {
  const src = path.join(TEMPLATE, rel);
  const dest = path.join(destDir, rel);
  if (fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

// shortcut: <limit> lines cap note size, <upgrade> when full RAG lands
async function ensureVault(projectDir) {
  const vault = path.join(projectDir, "obsidian");
  const dot = path.join(vault, ".obsidian");
  const created = !fs.existsSync(dot);
  fs.mkdirSync(path.join(vault, "notes"), { recursive: true });
  for (const rel of [".obsidian/app.json", ".obsidian/community-plugins.json", ".obsidian/core-plugins.json", "README.md"]) {
    copyTemplateFile(rel, vault);
  }
  for (const [id, meta] of Object.entries(VERSIONS)) {
    const plugDir = path.join(dot, "plugins", id);
    fs.mkdirSync(plugDir, { recursive: true });
    for (const [file, url] of Object.entries(meta.files)) {
      const dest = path.join(plugDir, file);
      if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
        await fetchTo(url, dest);
      }
    }
  }
  return { vault, created };
}

function appendNote(projectDir, sessionId, text) {
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(projectDir, "obsidian", "notes", `${day}.md`);
  const body = `\n\n## ${new Date().toISOString()} · ${sessionId}\n\n${String(text || "").slice(0, 8000)}\n`;
  fs.appendFileSync(file, body);
  return file;
}

function searchVault(projectDir, q, limit = 20) {
  const vault = path.join(projectDir, "obsidian");
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (out.length >= limit) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === ".obsidian") continue;
        walk(p);
      } else if (e.name.endsWith(".md")) {
        const lines = fs.readFileSync(p, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (out.length < limit && line.toLowerCase().includes(q)) {
            out.push({ path: path.relative(vault, p), line: i + 1, snippet: line.slice(0, 300) });
          }
        });
      }
    }
  };
  if (fs.existsSync(vault)) walk(vault);
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "GET" && url.pathname === "/search") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const dir = url.searchParams.get("dir") || "";
    if (!q || !dir) return json(res, 400, { ok: false, error: "q and dir required" });
    try {
      return json(res, 200, { ok: true, results: searchVault(dir, q) });
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e).slice(0, 200) });
    }
  }
  if (req.method === "POST" && url.pathname === "/session-events") {
    if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) {
      return json(res, 401, { ok: false, error: "bad bearer" });
    }
    let raw = "";
    for await (const c of req) raw += c;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { ok: false, error: "bad json" });
    }
    const type = body?.event?.type;
    const dir = body?.event?.project?.directory;
    if (!type || !dir) return json(res, 400, { ok: false, error: "not a session event" });
    try {
      if (type === "session-created") {
        const { created } = await ensureVault(dir);
        return json(res, 200, { ok: true, vault: created ? "created" : "exists" });
      }
      if (type === "turn-finished") {
        await ensureVault(dir);
        const reply = body?.content?.type === "turn-finished" ? body.content.reply : "";
        const file = appendNote(dir, body?.event?.session?.id || "session", reply);
        return json(res, 200, { ok: true, note: file });
      }
      return json(res, 200, { ok: true, ignored: type });
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e).slice(0, 200) });
    }
  }
  return json(res, 404, { ok: false });
});

server.listen(PORT, "127.0.0.1", () => console.log(`vault service on 127.0.0.1:${PORT}`));
