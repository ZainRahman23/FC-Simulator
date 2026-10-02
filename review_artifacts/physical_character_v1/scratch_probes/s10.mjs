import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const D = await import(PC + "/pc_gated.js"); const { D6Diag } = await import(PC + "/pc_d6diag.js"); const nb = spec.bodies.length; const f = (x, d = 2) => x == null ? "-" : (+x).toFixed(d);
const win = (R, t0, t1) => R.filter(q => q.t > t0 && q.t <= t1).reduce((a, q) => a.map((v, i) => v + q.ledger.turf[i]), [0, 0, 0]);
const shear = (R) => R.reduce((a, q) => a + Math.hypot(q.ledger.turf[0], q.ledger.turf[2]), 0);
for (const key of ["S4_steps10", "S5_F80"]) { const out = [];
  for (const sub of [1, 2]) { const r = G.runG1a(J, spec, key, { poses, sub }); const R = r.recs, tds = r.steps.filter(s => s.tdT != null);
    const land = tds.map(s => win(R, s.tdT - 0.005, s.tdT + 0.05)[1]); const push = key === "S5_F80" ? win(R, 1.0, 1.5) : null;
    out.push({ sub, outcome: r.outcome, hash: r.hash, turfY: r.ledger.turfImpulseNs[1], shearNs: shear(R), landY: land, tds: tds.map(s => s.tdT), push, res: r.ledger.residualMaxNs, ms: r.cpu.msPerFrame }); }
  const [a, b] = out, rel = (x, y) => x === 0 && y === 0 ? 0 : Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y)) * 100;
  console.log(`== ${key}: outcome ${a.outcome} / ${b.outcome} | turf y ${f(a.turfY)} / ${f(b.turfY)} (${f(rel(a.turfY, b.turfY), 2)} %) | Σ|shear| ${f(a.shearNs)} / ${f(b.shearNs)} (${f(rel(a.shearNs, b.shearNs), 1)} %) | ledger res ${a.res} / ${b.res} | cpu ${a.ms} / ${b.ms}`);
  console.log(`   landing impulse (0–50 ms, N·s): ${a.landY.map((v, i) => `${f(v, 1)}/${f(b.landY[i], 1)}`).join("  ")}`);
  console.log(`   touchdowns: ${a.tds.map((v, i) => `${f(v, 3)}/${f(b.tds[i], 3)}`).join(" ")}`);
  if (a.push) console.log(`   turf impulse 1.0–1.5 s: ${a.push.map(v => f(v, 1)).join(",")} / ${b.push.map(v => f(v, 1)).join(",")} (z ${f(rel(a.push[2], b.push[2]), 1)} %)`); }
for (const sub of [1, 2]) { const dp = new D6Diag(spec, { plate: true }), tw = D.runD(J, spec, "D6_slide", { poses, sub, Bloco: {}, world: { plateFrom: nb, plateLate: true }, onStep: (x) => dp.onStep(x) }), P = dp.summary(tw);
  const W = P.momentum.windows; console.log(`D6_slide sub ${sub}: B ${P.outcome} | A→B per window ${Object.entries(W).map(([k, v]) => `${k} ${v.AtoB.map(x => f(x, 1)).join(",")}`).join(" | ")} | struck slide ${P.feet.struckSlideCm} cm`); }
