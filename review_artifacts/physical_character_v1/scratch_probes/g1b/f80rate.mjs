import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d), runs = {};
for (const [nm, o] of [["240", { sub: 1 }], ["480", { sub: 2 }], ["720", { sub: 3 }], ["960", { sub: 4 }], ["480static", { sub: 2, staticTurf: true }], ["240static", { sub: 1, staticTurf: true }]]) { const r = G.runG1a(J, spec, "S5_F80", { poses, keepStates: true, ...o }), R = r.recs, st = r.steps[0];
  const w = R.filter(q => q.t >= 1.9 && q.t <= 2.7), mm = Math.min(...w.map(q => q.xiMargin)), ld = Math.min(...w.map(q => q.feet.R.load)), ldL = Math.min(...w.map(q => q.feet.L.load));
  const at = (t) => R.find(q => q.t >= t - 1e-9); runs[nm] = R;
  console.log(`${nm.padEnd(9)} ${r.outcome.padEnd(20)} step ${st.sw} lift ${st.liftoffT} td ${st.tdT} err ${st.footholdErrCm} · 1.9–2.7 s: min ξ margin ${f(mm * 100, 1)} cm · min load R ${f(ld, 0)} N L ${f(ldL, 0)} N · COM@1.5 ${at(1.5).com.map(v => f(v)).join(",")} · COM@2.5 ${at(2.5).com.map(v => f(v)).join(",")} · feet@2.5 L ${at(2.5).fp.L.map(v => f(v)).join(",")} R ${at(2.5).fp.R.map(v => f(v)).join(",")} R.state ${at(2.5).feet.R.state}`); }
const dev = (a, b) => { const out = []; for (const t of [1.2, 1.4, 1.6, 2.0, 2.4, 2.7]) { const qa = runs[a].find(q => q.t >= t - 1e-9), qb = runs[b].find(q => q.t >= t - 1e-9); out.push(`${t}s ${f(Math.hypot(qa.com[0] - qb.com[0], qa.com[2] - qb.com[2]) * 100, 2)}cm`); } return out.join(" "); };
console.log("COM deviation from 960 Hz:  240:", dev("240", "960"), "|  480:", dev("480", "960"), "|  720:", dev("720", "960"));
