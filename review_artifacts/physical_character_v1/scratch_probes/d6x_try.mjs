// quick D6X knob exploration: node d6x_try.mjs <physchar> '<json list of variants>'
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const { V, Q } = await import(PC + "/pc_math.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec), nb = spec.bodies.length;
const list = JSON.parse(process.argv[3]); const f = (x, d = 2) => x == null ? "-" : (+x).toFixed(d);
for (const v of list) { const key = "try_" + (v.name || JSON.stringify(v).slice(0, 30)); D.TESTS_D6X[key] = D.mergeD6(D.TESTS_D.D6_slide, v);
  let firstTouch = null, com0 = null, comMinY = 9, tiltMax = 0, comEnd = null, maxV = 0, footL0 = null, footLmax = 0, comMax = 0, cls = new Set(), rightAir = 0;
  const r = D.runD(J, spec, key, { poses, keepStates: true, onStep: ({ n, t, w, A, B }) => { const o = B.obs, fl = B.states[spec.bodies.findIndex(b => b.name === "foot_L")].pos;
    if (!footL0) footL0 = fl.slice(); footLmax = Math.max(footLmax, Math.hypot(fl[0] - footL0[0], fl[2] - footL0[2])); maxV = Math.max(maxV, Math.hypot(o.vcom[0], o.vcom[2])); if (!com0) com0 = o.com.slice(); comMinY = Math.min(comMinY, o.com[1]); tiltMax = Math.max(tiltMax, o.trunkTiltDeg); comEnd = o.com.slice(); cls.add(B.ctrl.cls.state);
    if (!o.feet.R.touching && !o.feet.L.touching) rightAir++; else if (!o.feet.R.touching || !o.feet.L.touching) rightAir += 0.001;
    if (!firstTouch) { const c = w.contacts.find(c => c.a >= 0 && c.b >= 0 && (c.a < nb) !== (c.b < nb) && c.depth > -0.0005); if (c) { const ia = c.a < nb ? c.a : c.b, ib = c.a < nb ? c.b : c.a;
      firstTouch = { t, a: spec.bodies[ia].name, b: spec.bodies[ib - nb].name, y: c.pts[0][1], vA: Math.hypot(...A.obs.vcom) }; } } } });
  const B = r.Bres; console.log(`${(v.name || "").padEnd(22)} touch ${firstTouch ? `${f(firstTouch.t, 3)}s ${firstTouch.a}→${firstTouch.b} y ${f(firstTouch.y, 3)} A@${f(firstTouch.vA, 2)}m/s` : "none"} | B ${B.fell ? "FELL" : "UP"} ${B.finalCls} tFall ${B.tFalling ?? "-"} | foot_L moved ${f(footLmax * 100, 1)} cm | B |v_com| max ${f(maxV, 2)} COM y min ${f(comMinY, 2)} trunk ≤${f(tiltMax, 0)}° COM moved ${f(Math.hypot(comEnd[0] - com0[0], comEnd[2] - com0[2]) * 100, 0)} cm | cls ${[...cls].join(",")} | step ${B.step ? B.step.foot + " " + B.step.status : B.refused ? "refused: " + B.refused.slice(0, 40) : "-"} | A ${JSON.stringify(r.A.slide)}`);
  delete D.TESTS_D6X[key]; }
