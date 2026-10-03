// ═══ physchar2/tools/g2_capture.mjs — V2-G2 review stills: headless Chrome (software GL) driven over the DevTools protocol in real time ═══════
// The page simulates the scenario live to t (same G2Sim code path as the Node gate) and the still is captured.
// usage: node tools/g2_capture.mjs [port]   → review_artifacts/physical_character_v2/g2/shots/*.png
import fs from "fs"; import path from "path"; import os from "os"; import { spawn } from "child_process"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), PORT = +(process.argv[2] || 8172), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g2/shots");
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SHOTS = [
  ["g2_01_quiet_stance_REF", "scenario=quiet:10&t=5&cam=three&dist=3.5"],
  ["g2_02_push_F15_recovery_CoP_at_toes", "scenario=push:F:15&t=1.25&cam=side&dist=3.5"],
  ["g2_03_push_R15_lateral_load_transfer", "scenario=push:R:15&t=1.2&cam=front&dist=3.5"],
  ["g2_04_push_BL20_diagonal_recovery", "scenario=push:BL:20&t=1.3&cam=three&dist=3.5"],
  ["g2_05_push_F20_beyond_boundary_step_required", "scenario=push:F:20&t=1.8&cam=side&dist=3.6"],
  ["g2_06_push_F20_physical_fall", "scenario=push:F:20&t=3.2&cam=side&dist=3.8"],
  ["g2_07_angular_yaw8_trunk_rotation", "scenario=torque:yaw:8&t=1.2&cam=three&dist=3.5"],
  ["g2_08_quiet_stance_V2-165-62", "scenario=quiet:10&human=V2-165-62&t=5&cam=three&dist=3.4"],
  ["g2_09_push_L25_V2-198-92", "scenario=push:L:25&human=V2-198-92&t=1.3&cam=front&dist=3.6"],
  ["g2_10_offset_COM_over_ankles_settling", "scenario=offset:COM over ankles&t=0.5&cam=side&dist=3.5"],
];
fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) if (/^g2_.*\.png$/.test(f)) fs.rmSync(path.join(OUT, f));
for (const [n, [name, qs]] of SHOTS.entries()) {
  const dbg = 9700 + n, prof = path.join(os.tmpdir(), `v2g2_shot_${n}`), url = `http://127.0.0.1:${PORT}/sandbox/visual/physchar2/viewer/g2.html?${qs.replace(/ /g, "%20")}`;
  const ch = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${prof}`, `--remote-debugging-port=${dbg}`, "--window-size=1600,1000", "--hide-scrollbars", url], { stdio: "ignore" });
  const t0 = Date.now(); let ok = false;
  try {
    let ws = null; for (let i = 0; i < 60 && !ws; i++) { await sleep(500); try { const list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); const pg = list.find(p => p.type === "page" && p.url.includes("g2.html")); if (pg) ws = pg.webSocketDebuggerUrl; } catch (e) {} }
    const sock = new WebSocket(ws); await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; }); let id = 0; const pend = new Map();
    sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const call = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
    while (Date.now() - t0 < 300000) { await sleep(1000); const r = await call("Runtime.evaluate", { expression: "document.body.dataset.ready || ''", returnByValue: true }); const v = r.result && r.result.result && r.result.result.value; if (v === "1" || v === "error") { ok = v === "1"; break; } }
    await sleep(800); const shot = await call("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(shot.result.data, "base64")); sock.close();
  } catch (e) { console.error(name, e.message); }
  ch.kill("SIGKILL"); await sleep(800); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  console.log(`${ok ? "✓" : "✗"} ${name} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
