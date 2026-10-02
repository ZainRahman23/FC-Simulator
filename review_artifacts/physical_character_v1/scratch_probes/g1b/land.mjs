import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
// per-landing EVENT analysis of S4 (or another rhythm scenario) at several physics rates (control fixed at 240 Hz)
const key = process.argv[3] || "S4_steps10", variants = JSON.parse(process.argv[4] || '[{"name":"240","sub":1},{"name":"480","sub":2},{"name":"960","sub":4}]');
const M = spec.totalMass, g = 9.81, fI = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") }, dt = 1 / 240, WIN = [0.01, 0.025, 0.05, 0.1, 0.2, 0.4];
const out = {};
for (const v of variants) { const r = G.runG1a(J, spec, key, { poses, keepStates: true, sub: v.sub || 1, world: v.world }), R = r.recs, ev = [];
  for (const s of r.steps.filter(s => s.liftoffT != null && s.tdT != null)) { const sw = s.sw, st = sw === "L" ? "R" : "L";
    let ic = R.findIndex(q => q.t > s.liftoffT + 0.05 && q.feet[sw].touching); if (ic < 1) continue; const pre = R[ic - 1], t0 = pre.t;
    const J = (W) => R.filter(q => q.t > t0 && q.t <= t0 + W + 1e-9).reduce((a, q) => a + q.ledger.turf[1], 0), Jf = (W, f) => R.filter(q => q.t > t0 && q.t <= t0 + W + 1e-9).reduce((a, q) => a + Math.max(0, q.feet[f].load) * dt, 0);
    const vy = (q) => q.vcom[1], at = (W) => R.find(q => q.t >= t0 + W - 1e-9) || R[R.length - 1], win = R.filter(q => q.t > t0 && q.t <= t0 + 0.3);
    let pen = 0; for (const q of R.filter(q => q.t > t0 && q.t <= t0 + 0.05)) for (const c of q.cts || []) if ((c.a === fI[sw] || c.b === fI[sw]) && (c.a === -1 || c.b === -1)) pen = Math.max(pen, c.depth);
    ev.push({ sw, tc: +t0.toFixed(4), vFootY: +pre.states[fI[sw]].v[1].toFixed(3), vComY0: +vy(pre).toFixed(4), comY0: +pre.com[1].toFixed(4),
      J: WIN.map(W => +J(W).toFixed(2)), dP: WIN.map(W => +(M * (vy(at(W)) - vy(pre))).toFixed(2)), Jland: WIN.map(W => +Jf(W, sw).toFixed(2)), Jstance: WIN.map(W => +Jf(W, st).toFixed(2)),
      peakLand: +Math.max(...win.map(q => q.feet[sw].load)).toFixed(0), tPeakLand: +((win.reduce((a, q) => q.feet[sw].load > a.l ? { l: q.feet[sw].load, t: q.t } : a, { l: -1, t: t0 }).t - t0) * 1000).toFixed(1),
      peakGrf: +Math.max(...win.map(q => q.ledger.turf[1] / dt)).toFixed(0), comMin: +Math.min(...win.map(q => q.com[1])).toFixed(4), tComMin: +((win.reduce((a, q) => q.com[1] < a.y ? { y: q.com[1], t: q.t } : a, { y: 9, t: t0 }).t - t0) * 1000).toFixed(0), penMm: +(pen * 1000).toFixed(2),
      tLoaded: (() => { const q = R.find(q => q.t > t0 && q.feet[sw].load > 0.5 * M * g); return q ? +((q.t - t0) * 1000).toFixed(1) : null; })() }); }
  out[v.name] = { outcome: r.outcome, hash: r.hash, ev }; console.error(v.name, r.outcome, ev.length, "landings"); }
fs.writeFileSync(process.argv[5] || "/dev/stdout", JSON.stringify(out));
