import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d); const dbg = [];
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 2.1), onLoco: (l) => { const u0 = l.ctrl.update.bind(l.ctrl); l.ctrl.update = (o) => { const u = u0(o); dbg.push({ t: o.t, pd: u.debug && u.debug.pelvisTarget ? u.debug.pelvisTarget.pos : null, st: u.debug ? u.debug.stance : null, band: l.ctrl.bandInfo || null }); return u; }; } });
const t0 = +(process.env.T0 || 1.5), t1 = +(process.env.T1 || 2.0), ev = +(process.env.EV || 6), hipI = { L: spec.bodies.findIndex(b => b.name === "thigh_L"), R: spec.bodies.findIndex(b => b.name === "thigh_R") }, fI = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") };
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const d = dbg.find(x => Math.abs(x.t - q.t + 0.05) < 1e-6) || dbg.find(x => x.t >= q.t - 0.05 - 1e-6);
  const dist = (s) => { const h = q.states[hipI[s]].pos, a = q.states[fI[s]].pos; return Math.hypot(h[0] - a[0], h[1] - a[1], h[2] - a[2]); };
  console.log(f(q.t, 3), "pel", f(q.states[0].pos[1]), "target", d && d.pd ? f(d.pd[1]) : "-", "stance", d ? JSON.stringify(d.st) : "-", "| hip–ankle L", f(dist("L")), "R", f(dist("R")), "| L", q.feet.L.state, f(q.feet.L.load, 0), "R", q.feet.R.state, f(q.feet.R.load, 0)); }
