// ═══ physchar2/tools/g1_capture.mjs — V2-G1 review stills: headless Chrome (software GL) driven over the DevTools protocol in real time ═══════
// (the shell version with --virtual-time-budget took ≈ 4 min per still). cfg=ref is the gate baseline; DX-* diagnostics; hz= another rate.
// usage: node tools/g1_capture.mjs [port]   → review_artifacts/physical_character_v2/g1/shots/*.png
import fs from "fs"; import path from "path"; import os from "os"; import { spawn } from "child_process"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), PORT = +(process.argv[2] || 8172), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g1/shots");
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SHOTS = [
  ["g1_01_singleLeg_boot_rest_gate_10piece", "scenario=singleLeg&t=9.8&cam=three&focus=foot_R&dist=0.9&yaw=-60&pitch=14&show=colliders"],
  ["g1_02_singleLeg_boot_rest_single_hull_DX-R1", "scenario=singleLeg&cfg=DX-R1&t=9.8&cam=three&focus=foot_R&dist=0.9&yaw=-60&pitch=14&show=colliders"],
  ["g1_03_leanB_boot_rest_previous_baseline_DX-PREV", "scenario=leanB&cfg=DX-PREV&t=9.8&cam=three&focus=foot_L&dist=0.9&yaw=60&pitch=14&show=colliders"],
  ["g1_04_leanB_boot_rest_gate_10piece", "scenario=leanB&t=9.8&cam=three&focus=foot_L&dist=0.9&yaw=60&pitch=14&show=colliders"],
  ["g1_05_dropA_impact_gate_no_rebound", "scenario=dropA&t=0.0875&cam=side&follow=1&dist=2.2&pitch=4&show=vel"],
  ["g1_06_awkward_knee_rotation_overshoot", "scenario=awkward&t=0.425&cam=three&focus=shank_R&dist=1.4&show=limits&joint=knee_R"],
  ["g1_07_198-92_upright_settled_shoulder_1.32deg", "scenario=upright&human=V2-198-92&t=9.8&cam=three&focus=upperArm_R&dist=1.4&show=limits&joint=shoulder_R"],
  ["g1_08_leanF_240Hz_lands_prone", "scenario=leanF&t=9.8&cam=three&follow=1&dist=2.6"],
  ["g1_09_leanF_720Hz_lands_supine", "scenario=leanF&hz=720&t=9.8&cam=three&follow=1&dist=2.6"],
  ["g1_10_hsKickShin_known_issue", "scenario=hsKickShin&t=0.06&cam=side&focus=foot_R&dist=1.3&pitch=4&show=colliders"],
  ["g1_11_impact15_first_touch_diagnostic", "scenario=impact15&t=0.021&cam=side&follow=1&dist=2.2&pitch=3&show=colliders"],
  ["g1_12_isoSelfCol_leg_contact", "scenario=isoSelfCol&t=0.03&cam=front&focus=shank_R&dist=1.4&pitch=5"],
];
fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) if (/^g1_.*\.png$/.test(f)) fs.rmSync(path.join(OUT, f));
for (const [n, [name, qs]] of SHOTS.entries()) {
  const dbg = 9400 + n, prof = path.join(os.tmpdir(), `v2g1_shot_${n}`), url = `http://127.0.0.1:${PORT}/sandbox/visual/physchar2/viewer/g1.html?${qs}`;
  const ch = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${prof}`, `--remote-debugging-port=${dbg}`, "--window-size=1600,1000", "--hide-scrollbars", url], { stdio: "ignore" });
  const t0 = Date.now(); let ok = false;
  try {
    let ws = null; for (let i = 0; i < 60 && !ws; i++) { await sleep(500); try { const list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); const pg = list.find(p => p.type === "page" && p.url.includes("g1.html")); if (pg) ws = pg.webSocketDebuggerUrl; } catch (e) {} }
    const sock = new WebSocket(ws); await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; }); let id = 0; const pend = new Map();
    sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const call = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
    while (Date.now() - t0 < 300000) { await sleep(1000); const r = await call("Runtime.evaluate", { expression: "document.body.dataset.ready || ''", returnByValue: true }); const v = r.result && r.result.result && r.result.result.value; if (v === "1" || v === "error") { ok = v === "1"; break; } }
    await sleep(800); const shot = await call("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(shot.result.data, "base64")); sock.close();
  } catch (e) { console.error(name, e.message); }
  ch.kill("SIGKILL"); await sleep(800); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  console.log(`${ok ? "✓" : "✗"} ${name} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
