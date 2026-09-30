// EXPERIMENT (not the approved body): C3 with a boot-sized foot collider instead of the art-fitted 16.4 × 14.9 × 35.8 cm box.
// usage: node xo_foot_exp.mjs <physchar dir> <tests,...> [art|human] [crossover 0|1]
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TESTS = process.argv[3].split(","), FOOT = process.argv[4] || "human", XO = process.argv[5] !== "0";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const { STEP } = await import(PC + "/pc_step.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
STEP.crossover = XO; if (process.env.VMAX) STEP.vFootMax = +process.env.VMAX;
if (FOOT === "human") for (const b of spec.bodies) if (/^foot_/.test(b.name)) { const s = b.shapes[0], yb = s.pos[1] - s.he[1];     // keep the sole plane
  const hx = 0.0525, z0 = -0.06, z1 = 0.23, top = 0.0;                                     // 10.5 cm wide, heel 6 cm behind the ankle, 29 cm long, top at the ankle joint
  b.shapes[0] = { ...s, pos: [s.pos[0], (yb + top) / 2, (z0 + z1) / 2], he: [hx, (top - yb) / 2, (z1 - z0) / 2] }; }
const fb = spec.bodies.find(b => b.name === "foot_R").shapes[0]; console.log(`foot box (${FOOT}) he ${fb.he.map(v => (2 * v * 100).toFixed(1)).join(" × ")} cm · crossover ${XO}`);
const { CorrectiveStepper } = await import(PC + "/pc_step.js"); const orig = CorrectiveStepper.prototype._choose; let shown = 0;
if (process.env.CANDS) CorrectiveStepper.prototype._choose = function (o) { const r = orig.call(this, o); if (shown++ < 1) { console.log(`  t ${o.t.toFixed(3)} ξ ${o.xi.map(v => v.toFixed(3))} com ${[o.com[0], o.com[2]].map(v => v.toFixed(3))} v ${[o.vcom[0], o.vcom[2]].map(v => v.toFixed(2))} loads L ${o.feet.L.load.toFixed(0)} R ${o.feet.R.load.toFixed(0)} Lc ${this.geo._center(o, "L").map(v => v.toFixed(3))} Rc ${this.geo._center(o, "R").map(v => v.toFixed(3))}`);
  for (const c of this.allCands) console.log("   ", c ? JSON.stringify({ sw: c.sw, want: c.want && c.want.map(v => +v.toFixed(3)), target: c.target && c.target.map(v => +v.toFixed(3)), xtd: c.xtd && c.xtd.map(v => +v.toFixed(3)), T: c.T && +c.T.toFixed(3), margin: c.margin && +c.margin.toFixed(3), reasons: (c.reasons || []).slice(0, 3) }) : "null"); } return r; };
for (const t of TESTS) { shown = 0; const r = C3.runC3(J, spec, t, {}); const s = r.step || {};
  console.log(`${t.padEnd(18)} ${String(r.outcome).padEnd(22)} ${r.refused ? "NO STEP: " + r.refused : `${s.foot || s.sw || "-"} step · liftoff ${s.liftoffAfterNeedS ?? "-"} · td ${s.touchdownAfterNeedS != null ? s.touchdownAfterNeedS.toFixed(3) : "-"} · ${s.fail || s.status || ""}`} | hash ${r.hash}`.slice(0, 330)); }
