import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const C = await import(PC + "/pc_g2char.js"); const W = spec.totalMass * 9.81;
const base = C.CHAR_BASE(0.6); const steps = []; for (let i = 0; i < 5; i++) steps.push({ sw: i % 2 === 0 ? "R" : "L" });
let LOCO = null; const r = G2.runG2a(J, spec, "G2b_walk08", { poses, keepStates: false, seconds: 3.4, rhythmOver: { walk: { ...base.walk, char: { 0: { df: 0.237, dl: 0.368, T: 0.45 }, 1: { df: 0.34, dl: 0.26, T: 0.45 } } }, steps, at: 0.5 }, humanOver: base.human, onLoco: (l) => { LOCO = l; } });
// per double support: when each end condition first holds (time after touchdown): planned duration elapsed, landed foot heel AND toe down, landed ≥ 35 % BW, trailing ≤ 30 % BW
let cur = null; const out = [];
for (const q of r.recs) { const st = q.rhythm ? q.rhythm.stage : null; const rh = LOCO.planner.rhythm;
  if (st === "DS" && !cur && q.t > 1.7) { const last = LOCO.planner.exec.done.filter(d => d.td && d.td.t <= q.t + 1e-6).pop(); if (!last) continue; cur = { td: last.td.t, landed: last.sw, trail: last.sw === "R" ? "L" : "R", first: {} }; }
  if (cur) { const dt = q.t - cur.td, F = q.feet[cur.landed], Tr = q.feet[cur.trail], set = (k, c) => { if (c && cur.first[k] == null) cur.first[k] = dt; };
    set("planned 0.15 s", dt >= 0.15); set("landed heel+toe", F.heel && F.toe); set("landed ≥ 35 % BW", F.load >= 0.35 * W); set("trailing ≤ 30 % BW", Tr.load <= 0.30 * W); set("trailing unloaded (< 25 N)", Tr.load < 25);
    if (st === "SS") { cur.end = dt; out.push(cur); cur = null; } } }
for (const c of out) console.log(`DS after ${c.landed} touchdown @ ${c.td.toFixed(3)}: ended at +${c.end.toFixed(3)} s | ` + Object.entries(c.first).map(([k, v]) => `${k} +${v.toFixed(3)}`).join(" · "));
