// ═══ physchar2/tools/g3_capture.mjs — V2-G3 review stills: headless Chrome (software GL) driven over the DevTools protocol in real time ═══════
// The page simulates the scenario live to t (same G3Sim code path as the Node gate) and the still is captured.
// usage: node tools/g3_capture.mjs [port]   → review_artifacts/physical_character_v2/g3/shots/*.png
import fs from "fs"; import path from "path"; import os from "os"; import { spawn } from "child_process"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), PORT = +(process.argv[2] || 8172), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g3/shots");
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SHOTS = [
  ["g3_01_bilateral_start_T5", "scenario=T5&t=0.9&cam=front&dist=3.2"],
  ["g3_02_partial_transfer_mid_ramp_T5", "scenario=T5&t=3.0&cam=front&dist=3.2"],
  ["g3_03_near_single_support_R_T5", "scenario=T5&t=10&cam=front&dist=3.2"],
  ["g3_04_near_single_support_R_feet_T5", "scenario=T5&t=10&cam=feet"],
  ["g3_05_unloaded_left_foot_held_U-R", "scenario=U:R&t=9.5&cam=feet"],
  ["g3_06_unloaded_left_foot_body_U-R", "scenario=U:R&t=9.5&cam=three&dist=3.2"],
  ["g3_07_near_single_support_L_T6", "scenario=T6&t=10&cam=front&dist=3.2"],
  ["g3_08_push_inward_L15_during_hold_abort", "scenario=T8:hold:R:L:15&t=4.25&cam=front&dist=3.3"],
  ["g3_09_push_outward_R15_step_required", "scenario=T8:hold:R:R:15&t=4.6&cam=front&dist=3.4"],
  ["g3_10_excessive_lambda_1.4_fails", "scenario=T11:over:1.4&t=5.6&cam=front&dist=3.6"],
  ["g3_11_V2-198-92_near_single_support_L", "scenario=T9:V2-198-92&t=21&cam=front&dist=3.5"],
  ["g3_12_heel_forefoot_on_stance_foot_FA", "scenario=FA&t=7.6&cam=side&dist=3.2"],
];
fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) if (/^g3_.*\.png$/.test(f)) fs.rmSync(path.join(OUT, f));
for (const [n, [name, qs]] of SHOTS.entries()) {
  const dbg = 9800 + n, prof = path.join(os.tmpdir(), `v2g3_shot_${n}`), url = `http://127.0.0.1:${PORT}/sandbox/visual/physchar2/viewer/g3.html?${qs.replace(/ /g, "%20")}`;
  const ch = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${prof}`, `--remote-debugging-port=${dbg}`, "--window-size=1600,1000", "--hide-scrollbars", url], { stdio: "ignore" });
  const t0 = Date.now(); let ok = false;
  try {
    let ws = null; for (let i = 0; i < 60 && !ws; i++) { await sleep(500); try { const list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); const pg = list.find(p => p.type === "page" && p.url.includes("g3.html")); if (pg) ws = pg.webSocketDebuggerUrl; } catch (e) {} }
    const sock = new WebSocket(ws); await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; }); let id = 0; const pend = new Map();
    sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const call = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
    while (Date.now() - t0 < 300000) { await sleep(1000); const r = await call("Runtime.evaluate", { expression: "document.body.dataset.ready || ''", returnByValue: true }); const v = r.result && r.result.result && r.result.result.value; if (v === "1" || v === "error") { ok = v === "1"; break; } }
    await sleep(800); const shot = await call("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(shot.result.data, "base64")); sock.close();
  } catch (e) { console.error(name, e.message); }
  ch.kill("SIGKILL"); await sleep(800); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  console.log(`${ok ? "✓" : "✗"} ${name} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
