import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gated.js"); const { D6Diag } = await import(PC + "/pc_d6diag.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const nb = spec.bodies.length, f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d), out = {};
for (const [bn, bl] of [["new", {}], ["approved", null]]) for (const sub of [1, 2, 4]) { const dp = new D6Diag(spec, { plate: true });
  const tw = G.runD(J, spec, "D6_slide", { poses, sub, ...(bl ? { Bloco: bl } : {}), world: { plateFrom: nb, plateLate: true }, onStep: (x) => dp.onStep(x) }), P = dp.summary(tw), W = P.momentum.windows;
  const rec = dp.rec, iT = rec.findIndex(q => q.touch), lastT = (() => { let k = -1; rec.forEach((q, i) => { if (q.touch) k = i; }); return k; })();
  const AB = rec.reduce((a, q) => q.JAB ? a.map((v, i) => v + q.JAB[i]) : a, [0, 0, 0]), ABc = rec.slice(iT, lastT + 1).reduce((a, q) => q.JAB ? a.map((v, i) => v + q.JAB[i]) : a, [0, 0, 0]);
  const B = (i) => rec[Math.min(rec.length - 1, i)].B;
  out[bn + sub] = { outcome: P.outcome, touchT: rec[iT] ? rec[iT].t : null, contactMs: (lastT - iT + 1) * 1000 / 240, AtoBtotal: AB.map(v => +v.toFixed(1)), AtoBcontact: ABc.map(v => +v.toFixed(1)), struck: P.feet.struckSlideCm, comPeak: P.body.comPeakSpeed, comMoved: P.body.comMovedCm, trunk: P.body.trunkMaxDeg,
    Bcom1s: B(iT + 240).com.map(v => +v.toFixed(3)), windows: Object.fromEntries(Object.entries(W).map(([k, v]) => [k, +v.AtoB[0].toFixed(1)])) };
  const o = out[bn + sub]; console.log(`${bn.padEnd(8)} ${240 * sub} Hz: ${o.outcome.padEnd(40)} touch ${f(o.touchT, 3)} contact ${f(o.contactMs, 0)} ms · A→B total ${o.AtoBtotal.join(",")} · during contact ${o.AtoBcontact.join(",")} · struck slide ${o.struck} cm · COM peak ${o.comPeak} m/s moved ${o.comMoved} cm · trunk ${o.trunk}° · windows x ${JSON.stringify(o.windows)}`); }
fs.writeFileSync(process.argv[3], JSON.stringify(out));
