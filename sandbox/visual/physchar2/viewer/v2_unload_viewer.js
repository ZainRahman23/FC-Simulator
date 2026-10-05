// ═══ physchar2/viewer/v2_unload_viewer.js — browser = Node check of the unloading characterization (unload_fix/UNLOAD_FIX_PREREG.md §3.2 set W, criterion A6).
// Loads one manifest run (?id=…&manifest=…&results=<dir with the Node result JSON>), builds the identical simulation through gates/v2_unload.js, runs it
// to its end and compares the running state hash at every 1 s mark and at the end with the Node result. Check mode only (no rendering).
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js";
const qp = new URLSearchParams(location.search), el = document.getElementById("hash");
(async () => { try {
  const J = await loadJolt(new URL("../vendor/jolt-physics.wasm-compat.js", import.meta.url).href), id = qp.get("id");
  const man = await (await fetch(new URL(qp.get("manifest"), location.href))).json(), run = man.runs.find(r => r.id === id);
  const node = await (await fetch(new URL(qp.get("results") + "/" + id + ".json", location.href))).json();
  const { s } = unloadSim(J, unloadSpec(run.body), run), hashes = {};
  while (s.tick()) { if (s.n % 240 === 0) { hashes[String(Math.round(s.n * s.dt))] = (s.h >>> 0).toString(16).padStart(8, "0"); el.textContent = `running ${id} … ${(s.n * s.dt).toFixed(0)} s`; await new Promise(r => setTimeout(r, 0)); } }
  hashes.end = (s.h >>> 0).toString(16).padStart(8, "0"); s.destroy();
  const keys = Object.keys(node.hashes), same = keys.length === Object.keys(hashes).length && keys.every(k => node.hashes[k] === hashes[k]);
  el.className = same ? "ok" : "bad"; el.textContent = `${same ? "BROWSER = NODE" : "BROWSER ≠ NODE"}\n${same ? "✓" : "✗"} ${id}: ${hashes.end} / ${node.hashes.end} (${keys.filter(k => node.hashes[k] === hashes[k]).length}/${keys.length} marks)`;
} catch (e) { el.className = "bad"; el.textContent = "ERROR " + e.message; } })();
