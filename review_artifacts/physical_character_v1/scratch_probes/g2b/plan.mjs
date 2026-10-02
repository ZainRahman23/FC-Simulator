import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// the walking SS plans: per rhythmic step — stance point (sole centre) vs the stance ankle, ξ at the plan start, roll r, Tss, the plan's ξ at the
// end, the DCM target, Lc / Lnext of the gradual law, and the plan reference at a few times vs the measured ξ
const OV = process.env.OVER ? JSON.parse(process.env.OVER) : {}; let LOCO = null; const marks = [];
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 3), onLoco: (l) => { LOCO = l; const p = l.planner, f0 = p._walkPlan.bind(p); p._walkPlan = (o, step, xi0) => { const out = f0(o, step, xi0); marks.push({ t: o.t, sw: step.sw, xi0, out, Lc: p.lastLc ? { ...p.lastLc } : null, ank: o.states[p.geo.foot[step.sw === "L" ? "R" : "L"]].pos.slice() }); return out; }; } , ...OV });
const h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (a, b) => (a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1];
for (const m of marks) { const o = m.out, K = o.walkK; console.log(`${m.t.toFixed(3)} ${m.sw}-swing | stance pt − ankle ${(fw(o.pSt, [m.ank[0], m.ank[2]]) * 100).toFixed(1)} cm | ξ0 − pSt ${(fw(m.xi0, o.pSt) * 100).toFixed(1)} | eos − pSt ${(fw(o.xiTd, o.pSt) * 100).toFixed(1)} | target − pSt ${(fw(o.target, o.pSt) * 100).toFixed(1)} | r ${K.r} Tss ${K.Tss.toFixed(3)} | cNext along ${(K.cNext[0] * hd[0] + K.cNext[1] * hd[1]).toFixed(3)} | Lc ${m.Lc ? m.Lc.Lc.toFixed(3) + " → L* " + m.Lc.Lnext.toFixed(3) : "-"}`); }
