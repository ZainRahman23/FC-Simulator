import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// DS unloading audit: commanded share/bound/aMin of the unloading foot vs its measured load; the trailing leg's arbiter terms (knee/ankle)
let LC = null; const dbg = [];
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}), keepStates: true, seconds: +(process.env.SEC || 2.0), onLoco: (l) => { LC = l; const c0 = l.control.bind(l); l.control = (tr, x) => { const out = c0(tr, x); dbg.push({ t: tr.t, unl: out.debug && out.debug.unload, pS: out.debug && out.debug.pStar, hr: out.plan && out.plan.heelRise, ul: out.plan && out.plan.unloading, Pd: out.debug && out.debug.pelvisTarget && out.debug.pelvisTarget.pos }); return out; }; } });
const t0 = +(process.env.T0 || 1.7), t1 = +(process.env.T1 || 1.95), ev = +(process.env.EV || 3), ji = (n) => spec.joints.findIndex(j => j.name === n);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const d = dbg.find(z => Math.abs(z.t - q.t) < 1e-6) || {}, sw = process.env.SW || "L";
  const arb = (jn) => { const e = q.arb.find(a => a.joint === jn || a.joint === ji(jn)); if (process.env.DUMP && !globalThis.__d) { globalThis.__d = 1; console.log(JSON.stringify(q.arb[3]).slice(0, 600)); } if (!e) return "-"; return e.terms.map(tm => `${tm.m}:${(Array.isArray(tm.req) ? tm.req.map(v => v.toFixed(0)).join("/") : (+tm.req).toFixed(0))}`).join(" ") + ` real ${Array.isArray(e.real) ? e.real.map(v => v.toFixed(0)).join("/") : e.real}`; };
  console.log(`${f(q.t)} ${q.rhythm ? q.rhythm.stage : ""} ${sw} load ${f(q.feet[sw].load, 0)} ${q.feet[sw].state.slice(0, 5)} | unl ${d.unl ? `bound ${f(d.unl.bound, 2)} aMin ${f(d.unl.aMin, 2)} share ${f(d.unl.share, 2)}` : "-"} | hr ${d.hr ? f(d.hr.rad * 57.3, 1) : "-"} | pel ${f(q.states[0].pos[1])} Pd ${d.Pd ? f(d.Pd[1]) : "-"}`);
  if (process.env.ARB) console.log(`     knee ${arb("knee_" + sw)}\n     ankle ${arb("ankle_" + sw)}\n     hip ${arb("hip_" + sw)}`); }
