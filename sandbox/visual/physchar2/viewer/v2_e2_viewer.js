// ═══ physchar2/viewer/v2_e2_viewer.js — browser = Node check of an E2 run (e2/E2_PREREGISTRATION_v2.md set W). Loads ?node=<the Node run's W hash file (tools/e2_run.mjs --whash)>,
// builds the identical simulation through gates/v2_e2.js (same run definition), runs it to the Node run's end and compares the running state hash at every mark. Check mode only.
import { loadJolt } from "../core/v2_jolt.js"; import { e2Sim, e2Spec } from "../gates/v2_e2.js";
const qp = new URLSearchParams(location.search), el = document.getElementById("hash");
(async () => { try {
  const J = await loadJolt(new URL("../vendor/jolt-physics.wasm-compat.js", import.meta.url).href), node = await (await fetch(new URL(qp.get("node"), location.href))).json(), run = node.run, id = qp.get("id") || "run";
  const { s, H } = e2Sim(J, e2Spec(run.human), run), hashes = {};
  while (true) { const st0 = s.st; if (!s.tick()) break; const t = s.n * s.dt; if (s.n % 240 === 0) { hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0"); el.textContent = `running ${id} … ${t.toFixed(0)} s`; await new Promise(r => setTimeout(r, 0)); }
    if (H.tEnd != null && t >= H.tEnd - 1e-9) break; }
  hashes.end = (s.h >>> 0).toString(16).padStart(8, "0"); s.destroy();
  const keys = Object.keys(node.hashes), same = keys.length === Object.keys(hashes).length && keys.every(k => node.hashes[k] === hashes[k]);
  el.className = same ? "ok" : "bad"; el.textContent = `${same ? "BROWSER = NODE" : "BROWSER ≠ NODE"}\n${same ? "✓" : "✗"} ${id}: ${hashes.end} / ${node.hashes.end} (${keys.filter(k => node.hashes[k] === hashes[k]).length}/${keys.length} marks)`;
} catch (e) { el.className = "bad"; el.textContent = "ERROR " + e.message + "\n" + (e.stack || ""); } })();
