#!/usr/bin/env node

import http from "node:http";
import { execSync, spawn } from "node:child_process";
import { existsSync, readdirSync, renameSync, mkdirSync, writeFileSync, statSync, rmSync, readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const DIST = join(DIR, "dist");

// ── Find Discord installations ────────────────────────────────────────

function findDiscordPaths() {
    const candidates = [
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Discord"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "DiscordCanary"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "DiscordPTB"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "DiscordDevelopment"),
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Discord"),
        process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Discord"),
    ].filter(Boolean);

    const results = [];
    for (const base of candidates) {
        if (!existsSync(base)) continue;
        const versions = readdirSync(base).filter(d => d.startsWith("app-"));
        for (const ver of versions) {
            const verPath = join(base, ver);
            const resources = join(verPath, "resources");
            const appAsar = join(resources, "app.asar");
            const _appAsar = join(resources, "_app.asar");
            const shimIndex = join(appAsar, "index.js");

            let state = "unknown";
            if (isFile(appAsar)) {
                state = "clean";
            } else if (isDirectory(appAsar) && existsSync(shimIndex)) {
                state = isFile(_appAsar) ? "injected" : "broken";
            }

            if (state !== "unknown") {
                results.push({
                    path: verPath,
                    version: ver.replace("app-", ""),
                    state,
                    branch: basename(base).replace("Discord", "") || "Stable",
                });
            }
        }
    }
    return results;
}

// ── Kill Discord processes ───────────────────────────────────────────

function killDiscord() {
    const names = ["Discord.exe", "DiscordCanary.exe", "DiscordPTB.exe", "DiscordDevelopment.exe"];
    for (const name of names) {
        try {
            execSync(`taskkill /f /im ${name} 2>nul`, { stdio: "ignore" });
        } catch {}
    }
    // Wait for processes to release file handles
    const maxWait = 3000;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        try {
            execSync(`tasklist /fi "imagename eq Discord.exe" /fo csv 2>nul | find /i "Discord"`, { stdio: "pipe" });
            const out = execSync(`tasklist /fi "imagename eq Discord.exe" /fo csv 2>nul`, { encoding: "utf8", stdio: "pipe" });
            if (!out.includes("Discord.exe") && !out.includes("DiscordCanary.exe") && !out.includes("DiscordPTB.exe") && !out.includes("DiscordDevelopment.exe")) {
                break;
            }
        } catch {}
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

function isDirectory(p) {
    try { return statSync(p).isDirectory(); } catch { return false; }
}

function isFile(p) {
    try { return statSync(p).isFile(); } catch { return false; }
}

function writeShim(appDir) {
    writeFileSync(join(appDir, "package.json"), JSON.stringify({ name: "discord", main: "index.js" }));

    const targetDist = join(appDir, "dist");
    if (!existsSync(targetDist)) mkdirSync(targetDist);
    if (existsSync(DIST)) {
        for (const f of readdirSync(DIST)) {
            const src = join(DIST, f);
            const dst = join(targetDist, f);
            if (statSync(src).isFile()) {
                writeFileSync(dst, readFileSync(src));
            }
        }
    }

    writeFileSync(join(appDir, "index.js"), "require('./dist/patcher.js');\n");
}

// ── Install DigiCord into a Discord path ──────────────────────────────

function install(target) {
    const resources = join(target, "resources");
    const app = join(resources, "app.asar");
    const _app = join(resources, "_app.asar");

    killDiscord();

    // Case 1: app.asar is a FILE (original Discord, no shim yet)
    if (isFile(app)) {
        // Move original aside
        renameSync(app, _app);
        mkdirSync(app);
        writeShim(app);
        return { success: true, action: "fresh" };
    }

    // Case 2: app.asar is a DIRECTORY (shim already exists, just update)
    if (isDirectory(app)) {
        writeShim(app);
        return { success: true, action: "updated" };
    }

    throw new Error("app.asar not found");
}

// ── Uninstall DigiCord from a Discord path ────────────────────────────

function uninstall(target) {
    const resources = join(target, "resources");
    const app = join(resources, "app.asar");
    const _app = join(resources, "_app.asar");

    killDiscord();

    // Only remove shim if we can restore the original asar
    if (isFile(_app)) {
        // Original asar exists safely, remove shim and restore
        if (isDirectory(app)) rmSync(app, { recursive: true, force: true });
        renameSync(_app, app);
        return { success: true, action: "restored" };
    }

    if (isDirectory(app)) {
        // Original asar is lost — don't remove shim, Discord would be broken
        return { success: false, action: "blocked",
            error: "Original app.asar is missing. Cannot uninstall safely. Reinstall Discord first." };
    }

    return { success: true, action: "clean" };
}

// ── Check if dist files exist ─────────────────────────────────────────

function checkBuild() {
    const needed = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];
    const missing = needed.filter(f => !existsSync(join(DIST, f)));
    return {
        ready: missing.length === 0,
        missing,
        distPath: DIST,
    };
}

// ── HTML page (embedded) ──────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DigiCord Installer</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #1e1e2e;
    --surface: #282840;
    --surface2: #32325a;
    --text: #cdd6f4;
    --text-muted: #6c7086;
    --accent: #cba6f7;
    --accent-hover: #b4befe;
    --green: #a6e3a1;
    --red: #f38ba8;
    --yellow: #f9e2af;
    --radius: 12px;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .container {
    width: 100%;
    max-width: 580px;
    animation: fadeIn .4s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 {
    font-size: 28px; font-weight: 700;
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header p { color: var(--text-muted); font-size: 14px; margin-top: 6px; }
  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 16px;
    transition: background .2s;
  }
  .card-title {
    font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
    color: var(--text-muted); margin-bottom: 12px;
  }
  .discord-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px; border-radius: 8px;
    background: var(--surface2); margin-bottom: 8px;
    transition: background .15s;
  }
  .discord-item:last-child { margin-bottom: 0; }
  .discord-item .info { flex: 1; min-width: 0; }
  .discord-item .branch {
    font-size: 13px; font-weight: 600; color: var(--text);
  }
  .discord-item .version {
    font-size: 12px; color: var(--text-muted); margin-top: 2px;
  }
  .discord-item .status {
    font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 500; white-space: nowrap;
  }
  .status-yes { background: rgba(166,227,161,.15); color: var(--green); }
  .status-no { background: rgba(243,139,168,.15); color: var(--red); }
  .status-maybe { background: rgba(249,226,175,.15); color: var(--yellow); }
  .status-broken { background: rgba(249,226,175,.15); color: var(--yellow); }
  .btn-warn { background: var(--yellow); color: var(--bg); }
  .actions { display: flex; gap: 8px; }
  .btn {
    padding: 8px 16px; border: none; border-radius: 6px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all .15s; white-space: nowrap;
  }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-primary { background: var(--accent); color: var(--bg); }
  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn-danger { background: transparent; border: 1px solid var(--red); color: var(--red); }
  .btn-danger:hover:not(:disabled) { background: rgba(243,139,168,.1); }
  .btn-ghost { background: var(--surface2); color: var(--text); }
  .btn-ghost:hover:not(:disabled) { background: color-mix(in srgb, var(--surface2) 80%, white); }
  .badge { font-size: 13px; font-weight: 600; }
  .badge-ok { color: var(--green); }
  .badge-fail { color: var(--red); }
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--surface); border-radius: 8px; padding: 12px 20px;
    font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,.4);
    animation: toastIn .3s ease; z-index: 100;
  }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } }
  .loader {
    width: 16px; height: 16px; border: 2px solid var(--surface2);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin .6s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .build-warning {
    background: rgba(249,226,175,.1); border-left: 3px solid var(--yellow);
    border-radius: 6px; padding: 12px; font-size: 13px; display: flex; align-items: center; gap: 8px;
  }
  .flex { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .mt12 { margin-top: 12px; }
  .no-discords { text-align: center; padding: 20px; color: var(--text-muted); font-size: 14px; }
  .hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
</style>
</head>
<body>
<div class="container" id="app">
  <div class="header">
    <h1>DigiCord</h1>
    <p>Inject DigiCord into Discord</p>
  </div>

  <div class="card" id="buildCard" style="display:none">
    <div class="card-title">Build Status</div>
    <div class="build-warning" id="buildWarning">
      <span>Build files not found. Run <code>pnpm build</code> first.</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Discord Installations</div>
    <div id="discordList">
      <div class="flex" style="justify-content:center;padding:20px"><span class="loader"></span></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Quick Actions</div>
    <div class="flex">
      <button class="btn btn-primary" onclick="refresh()">Refresh</button>
      <button class="btn btn-ghost" onclick="injectAll()" id="injectAllBtn">Inject All</button>
      <button class="btn btn-danger" onclick="uninjectAll()" id="uninjectAllBtn">Uninject All</button>
    </div>
    <div class="hint">Discord will be closed automatically during injection</div>
  </div>
</div>
<script>
const API = "";
let discords = [];

async function api(method, url, body) {
  const res = await fetch(API + url, { method, headers: body ? {"Content-Type":"application/json"} : {}, body: body && JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(msg, type) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 2500);
}

async function refresh() {
  document.getElementById("discordList").innerHTML = '<div class="flex" style="justify-content:center;padding:20px"><span class="loader"></span></div>';
  try {
    const [build, data] = await Promise.all([api("GET","/check"), api("GET","/discords")]);
    discords = data.discords;

    const bc = document.getElementById("buildCard");
    const bw = document.getElementById("buildWarning");
    if (!build.ready) {
      bc.style.display = "block";
      bw.innerHTML = '<span>Build files missing: ' + build.missing.join(", ") + '. Run <code>pnpm build</code> first.</span>';
    } else {
      bc.style.display = "none";
    }

    const list = document.getElementById("discordList");
    if (discords.length === 0) {
      list.innerHTML = '<div class="no-discords">No Discord installations found</div>';
      return;
    }
    const stateMap = { clean: ["Clean", "status-no", "Inject", "btn-primary"], injected: ["Injected", "status-yes", "Uninject", "btn-danger"], broken: ["Broken", "status-broken", "Repair", "btn-warn"] };
    list.innerHTML = discords.map((d, i) => {
      const [stLabel, stClass, btnLabel, btnClass] = stateMap[d.state] || ["Unknown", "status-no", "?", "btn-ghost"];
      const disabled = d.state === "broken" ? "disabled" : (!build.ready ? "disabled" : "");
      return \`
      <div class="discord-item" data-index="\${i}">
        <div class="info">
          <div class="branch">\${d.branch}</div>
          <div class="version">v\${d.version} &middot; \${d.path}</div>
        </div>
        <span class="status \${stClass}">\${stLabel}</span>
        <div class="actions">
          <button class="btn \${btnClass}" onclick="toggle(\${i})" \${disabled}>
            \${btnLabel}
          </button>
        </div>
      </div>
    \`}).join("");
  } catch(e) {
    document.getElementById("discordList").innerHTML = '<div class="no-discords">Error: ' + e.message + '</div>';
  }
}

async function toggle(i) {
  const d = discords[i];
  if (!d) return;
  const card = document.querySelector(\`.discord-item[data-index="\${i}"]\`);
  const btn = card?.querySelector(".btn");
  if (!card || !btn) return;
  btn.disabled = true; btn.textContent = "...";
  try {
    if (d.state === "injected") {
      await api("POST", "/uninstall", { path: d.path });
    } else {
      await api("POST", "/install", { path: d.path });
    }
    refresh();
    toast(d.state === "injected" ? "Removed from " + d.branch : "Injected into " + d.branch);
  } catch(e) {
    toast(e.message);
  }
}

async function injectAll() {
  document.getElementById("injectAllBtn").disabled = true;
  document.getElementById("uninjectAllBtn").disabled = true;
  for (const [i, d] of discords.entries()) {
    if (d.state === "injected") continue;
    await toggle(i);
  }
  refresh();
  document.getElementById("injectAllBtn").disabled = false;
  document.getElementById("uninjectAllBtn").disabled = false;
}

async function uninjectAll() {
  document.getElementById("injectAllBtn").disabled = true;
  document.getElementById("uninjectAllBtn").disabled = true;
  for (const [i, d] of discords.entries()) {
    if (d.state !== "injected") continue;
    await toggle(i);
  }
  refresh();
  document.getElementById("injectAllBtn").disabled = false;
  document.getElementById("uninjectAllBtn").disabled = false;
}

refresh();
</script>
</body>
</html>`;

// ── HTTP Server ───────────────────────────────────────────────────────

function serve() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, "http://localhost");
        const path = url.pathname;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            return res.end();
        }

        const sendJSON = (data, code = 200) => {
            res.writeHead(code, { "Content-Type": "application/json" });
            res.end(JSON.stringify(data));
        };

        const getBody = () => new Promise((resolve, reject) => {
            let body = "";
            req.on("data", c => body += c);
            req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); } });
            req.on("error", reject);
        });

        if (req.method === "GET" && path === "/") {
            res.writeHead(200, { "Content-Type": "text/html" });
            return res.end(HTML);
        }

        if (req.method === "GET" && path === "/discords") {
            return sendJSON({ discords: findDiscordPaths() });
        }

        if (req.method === "GET" && path === "/check") {
            return sendJSON(checkBuild());
        }

        if (req.method === "POST" && path === "/install") {
            getBody().then(({ path: target }) => {
                try {
                    const result = install(target);
                    sendJSON(result);
                } catch (e) {
                    sendJSON({ error: e.message }, 500);
                }
            });
            return;
        }

        if (req.method === "POST" && path === "/uninstall") {
            getBody().then(({ path: target }) => {
                try {
                    const result = uninstall(target);
                    if (result.success === false) {
                        sendJSON({ error: result.error }, 400);
                    } else {
                        sendJSON(result);
                    }
                } catch (e) {
                    sendJSON({ error: e.message }, 500);
                }
            });
            return;
        }

        sendJSON({ error: "Not found" }, 404);
    });

    const port = process.env.PORT || 0;
    server.listen(port, () => {
        const addr = server.address();
        const url = `http://localhost:${addr.port}`;
        console.log(`\n  \x1b[1;35mDigiCord Installer\x1b[0m`);
        console.log(`  ${url}\n`);
        // Auto-open browser
        try {
            if (process.platform === "win32") {
                spawn("cmd", ["/c", "start", url], { detached: true, stdio: "ignore" });
            } else if (process.platform === "darwin") {
                spawn("open", [url], { detached: true, stdio: "ignore" });
            } else {
                spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
            }
        } catch {}
    });
}

serve();
