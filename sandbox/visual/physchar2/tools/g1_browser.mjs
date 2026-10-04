// ═══ physchar2/tools/g1_browser.mjs — V2-G1 browser = Node check (spec 1.6c) ═══════════════════════════════════════════════════════════════
// Headless Chrome (software GL) loads viewer/g1.html?check=1&keys=<scenario> from the running review server — one fresh browser per curated
// scenario, V2-REF, gate baseline, full runs, the same G1Sim code path as Node — and the page compares its per-run hash with g1_results.json.
// The page is driven over the Chrome DevTools protocol (Node's built-in WebSocket) in REAL time; --virtual-time-budget stalled the page.
// usage: node tools/g1_browser.mjs [port]   → review_artifacts/physical_character_v2/g1/json/g1_browser.json
import fs from "fs"; import path from "path"; import os from "os"; import { spawn } from "child_process"; import { fileURLToPath } from "url";
import { CURATED } from "../gates/v2_g1.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), PORT = +(process.argv.slice(2).find(a => /^[0-9]+$/.test(a)) || 8172), XQS = (process.argv.find(a => a.startsWith("--qs=")) || "").slice(5), XOUT = (process.argv.find(a => a.startsWith("--out=")) || "").slice(6);   // close-decisions stage: --qs extra check-mode query (configuration), --out result file (default: the gate json, unchanged)
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", sleep = (ms) => new Promise(r => setTimeout(r, ms)), rows = [];
for (const [n, key] of CURATED.entries()) {
  const dbg = 9300 + n, prof = path.join(os.tmpdir(), `v2g1_cdp_${n}`), url = `http://127.0.0.1:${PORT}/sandbox/visual/physchar2/viewer/g1.html?check=1&keys=${key}${XQS ? "&" + XQS : ""}`;
  const ch = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${prof}`, `--remote-debugging-port=${dbg}`, "--window-size=1200,800", url], { stdio: "ignore" });
  let text = "", t0 = Date.now();
  try {
    let ws = null; for (let i = 0; i < 60 && !ws; i++) { await sleep(500); try { const list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); const pg = list.find(p => p.type === "page" && p.url.includes("g1.html")); if (pg) ws = pg.webSocketDebuggerUrl; } catch (e) {} }
    if (!ws) throw new Error("no DevTools page");
    const sock = new WebSocket(ws); await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; }); let id = 0; const pend = new Map();
    sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const evalJS = (expr) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } })); });
    while (Date.now() - t0 < 900000) { await sleep(2000); const r = await evalJS(`(document.getElementById("hash") || {}).innerText || ""`); text = (r.result && r.result.result && r.result.result.value) || ""; if (/BROWSER|ERROR/.test(text)) break; }
    sock.close();
  } catch (e) { text = "ERROR " + e.message; }
  ch.kill("SIGKILL"); await sleep(800); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  const m = text.match(new RegExp(`([✓✗]) ${key}: ([0-9a-f]{8})(?: vs Node ([0-9a-f—]+))?`));
  const row = m ? { key, browser: m[2], pass: m[1] === "✓", node: m[3] || m[2], seconds: Math.round((Date.now() - t0) / 1000) } : { key, browser: null, pass: false, node: null, error: text.slice(0, 200) };
  rows.push(row); console.log(`${row.pass ? "✓" : "✗"} ${key}: browser ${row.browser} node ${row.node} (${Math.round((Date.now() - t0) / 1000)} s)${row.error ? " " + row.error : ""}`);
}
const out = { check: "headless Chrome (swiftshader) driven over CDP, viewer/g1.html?check=1&keys=<scenario> — one fresh browser per curated scenario, V2-REF, gate baseline, full runs", allPass: rows.length === CURATED.length && rows.every(r => r.pass), rows };
fs.writeFileSync(XOUT || path.join(ROOT, "review_artifacts/physical_character_v2/g1/json/g1_browser.json"), JSON.stringify({ ...out, qs: XQS || null }, null, 1)); console.log(out.allPass ? "BROWSER = NODE" : "BROWSER ≠ NODE (or incomplete)", `${rows.filter(r => r.pass).length}/${rows.length}`);
