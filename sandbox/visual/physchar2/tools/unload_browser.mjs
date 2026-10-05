// ═══ physchar2/tools/unload_browser.mjs — browser = Node check of the unloading characterization (prereg §3.2 set W, criterion A6): headless Chrome over
// the DevTools protocol loads viewer/unload.html?check=1 from the running review server for each run id and reads the comparison the page makes.
// usage: node tools/unload_browser.mjs --ids=a,b --results=<dir relative to the viewer> --manifest=<path relative to the viewer> [--port=8172] --out=<json>
import fs from "fs"; import path from "path"; import os from "os"; import { spawn } from "child_process";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const IDS = arg("ids", "").split(",").filter(Boolean), PORT = +arg("port", 8172), RES = arg("results", ""), MAN = arg("manifest", ""), OUT = arg("out", "");
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", sleep = (ms) => new Promise(r => setTimeout(r, ms)), rows = [];
for (const [n, id] of IDS.entries()) {
  const dbg = 9800 + n, prof = path.join(os.tmpdir(), `v2unl_cdp_${n}`), url = `http://127.0.0.1:${PORT}/sandbox/visual/physchar2/viewer/unload.html?check=1&id=${encodeURIComponent(id)}&manifest=${encodeURIComponent(MAN)}&results=${encodeURIComponent(RES)}`;
  const ch = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${prof}`, `--remote-debugging-port=${dbg}`, "--window-size=1000,700", url], { stdio: "ignore" });
  let text = "", t0 = Date.now();
  try { let ws = null; for (let i = 0; i < 60 && !ws; i++) { await sleep(500); try { const list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); const pg = list.find(p => p.type === "page" && p.url.includes("unload.html")); if (pg) ws = pg.webSocketDebuggerUrl; } catch (e) {} }
    if (!ws) throw new Error("no DevTools page"); const sock = new WebSocket(ws); await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; }); let k = 0; const pend = new Map();
    sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const evalJS = (expr) => new Promise(res => { const i = ++k; pend.set(i, res); sock.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } })); });
    while (Date.now() - t0 < 900000) { await sleep(2000); const r = await evalJS(`(document.getElementById("hash") || {}).innerText || ""`); text = (r.result && r.result.result && r.result.result.value) || ""; if (/BROWSER|ERROR/.test(text)) break; } sock.close();
  } catch (e) { text = "ERROR " + e.message; }
  ch.kill("SIGKILL"); await sleep(800); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  const m = text.match(/([✓✗]) (\S+): ([0-9a-f]{8}) \/ ([0-9a-f]{8})/), row = m ? { id, pass: m[1] === "✓" && /BROWSER = NODE/.test(text), browser: m[3], node: m[4], seconds: Math.round((Date.now() - t0) / 1000) } : { id, pass: false, error: text.slice(0, 200) };
  rows.push(row); console.log(`${row.pass ? "✓" : "✗"} ${id}: browser ${row.browser} node ${row.node}${row.error ? " " + row.error : ""}`); }
const out = { check: "headless Chrome (swiftshader) over CDP, viewer/unload.html?check=1 — running state hash at every 1 s and the end vs the Node run", allPass: rows.length === IDS.length && rows.every(r => r.pass), rows };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(out.allPass ? "BROWSER = NODE" : "BROWSER ≠ NODE (or incomplete)", `${rows.filter(r => r.pass).length}/${rows.length}`);
