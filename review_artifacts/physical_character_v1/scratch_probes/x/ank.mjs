import { J, body, G2 } from "../fg/lib.mjs"; import fs from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/";
const models = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(JDM + "mU1_tau" + t + ".json", "utf8"))]));
const B = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, models };
const first = process.argv[2] || "R", at = +(process.argv[3] || 0.5), which = (process.argv[4] || "5").split(",").map(Number), n = 12, every = +(process.argv[5] || 6);
const { spec, poses } = body("F0"), steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, ...(process.env.ROCK ? { rocker: JSON.parse(process.env.ROCK) } : {}), ctrl: { ...base.ctrl, ...B } } }, onLoco: l => { LOCO = l; } });
const P = LOCO.planner, D = P.exec.done.filter(d => d.kind === "rhythmic"), h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)];
const e0 = r.recs[1500].arb.find(x => x.joint.startsWith("ankle")); console.log("ankle arb entry:", JSON.stringify({ joint: e0.joint, real: e0.real, sat: e0.sat, env: e0.env, terms: e0.terms.map(t => t.m) }).slice(0, 600));
for (const k of which) { const d = D.find(e => e.stepIndex === k), prev = D.find(e => e.stepIndex === k - 1); if (!d) continue; const st = d.sw === "R" ? "L" : "R", ps = d.pSt, rel = (p) => (p[0] - ps[0]) * hd[0] + (p[1] - ps[1]) * hd[1], fb = spec.bodies.findIndex(b => b.name === "foot_" + st);
  const t0 = prev && prev.td ? prev.td.t : d.tSw0 - 0.15; console.log(`step ${k}: stance ${st}, the previous touchdown ${t0.toFixed(3)}, step start ${d.tSw0.toFixed(3)}, liftoff ${d.liftoff.t.toFixed(3)}, td ${d.td ? d.td.t.toFixed(3) : "-"}`);
  console.log(" t-td  | ξ  COM  CoP | stance foot pitch(deg) toe heel load | ankle pitch: real (sat) | terms");
  let i = 0; for (const q of r.recs) { if (q.t < t0 - 0.01 || q.t > (d.td ? d.td.t : d.tSw0 + 0.5) || (i++ % every)) continue; const F = q.feet[st], S = q.states[fb], fz = [0, 0, 1], fwd = (() => { const v = [2 * (S.rot[0] * S.rot[2] + S.rot[3] * S.rot[1]), 2 * (S.rot[1] * S.rot[2] - S.rot[3] * S.rot[0]), 1 - 2 * (S.rot[0] * S.rot[0] + S.rot[1] * S.rot[1])]; return Math.atan2(v[1], Math.hypot(v[0], v[2])) * 57.3; })();
    const cs = q.copSmooth, cop = cs ? rel(cs.length === 3 ? [cs[0], cs[2]] : cs) : null, a = q.arb && q.arb.find(x => x.joint === "ankle_" + st);
    const ax = 1, re = a ? (Array.isArray(a.real) ? a.real[ax] : a.real) : null, sat = a ? (Array.isArray(a.sat) ? a.sat[ax] : a.sat) : null;
    const tm = a ? a.terms.map(t => `${t.m.slice(0, 18)}:${(Array.isArray(t.req) ? t.req[ax] : t.req).toFixed(0)}`).join(" ") : "";
    console.log(`${(q.t - t0).toFixed(3)} | ${rel(q.xi).toFixed(2)} ${rel([q.com[0], q.com[2]]).toFixed(2)} ${cop != null ? cop.toFixed(2) : "-"} | ${fwd.toFixed(1)} ${F.toe ? "T" : "-"}${F.heel ? "H" : "-"} ${(F.load / 736).toFixed(2)} | ${re != null ? re.toFixed(0) : "-"}${sat ? "*" : ""} | ${tm}`); } }
