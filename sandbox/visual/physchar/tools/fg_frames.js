// ═══ physchar/tools/fg_frames.js — FOOT-ARCHITECTURE GATE: frame dump for the side-by-side review page (measurement only) ═════════════
// Writes one run's collider poses (every body, 60 Hz) plus the per-foot channels the review plots — heel height, toe clearance (the lowest
// front point of the outline, or of the toe body for F2), hindfoot pitch, MTP angle / torque, ankle plantar-flexion torque, vertical turf
// load — and the step events (liftoff, touchdown, its swing fraction), as a script file the page loads with a <script> tag (works from
// file:// as well as over http): window.FG_RUNS.push({...}).
import fs from "fs"; import { V, Q } from "../pc_math.js";
const r4 = (v) => Math.round(v * 1e4) / 1e4, r2 = (v) => Math.round(v * 100) / 100;
export function dumpFrames(file, spec, recs, P, meta, opt = {}) {
  const t0 = opt.t0 ?? 0, t1 = opt.t1 ?? Infinity, every = opt.every ?? 4, W = spec.totalMass * 9.81, bi = (n) => spec.bodies.findIndex(b => b.name === n);
  const bodies = spec.bodies.map(b => ({ name: b.name, shapes: b.shapes.map(s => { const o = { ...s }; for (const k in o) if (Array.isArray(o[k])) o[k] = o[k].map(r4); else if (typeof o[k] === "number") o[k] = r4(o[k]); return o; }) }));
  const ft = {}; for (const s of ["L", "R"]) { const fb = bi("foot_" + s), tb = bi("toe_" + s); ft[s] = { fb, tb, sh: spec.bodies[fb].shapes[0], pb: spec.bodies[fb].planBox || spec.bodies[fb].shapes[0], tsh: tb >= 0 ? spec.bodies[tb].shapes[0] : null }; }
  const cor = (S, b, sh, sx, sz) => V.add(S[b].pos, Q.rot(S[b].rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] - sh.he[1], sh.pos[2] + sz * sh.he[2]]))[1];
  const frames = [];
  for (const q of recs) { if (q.t < t0 || q.t > t1 || q.n % every || !q.states) continue;
    const ch = {}; for (const s of ["L", "R"]) { const f = ft[s], S = q.states, fz = Q.rot(S[f.fb].rot, [0, 0, 1]);
      const heel = Math.min(cor(S, f.fb, f.sh, -1, -1), cor(S, f.fb, f.sh, 1, -1)), toe = f.tsh ? Math.min(cor(S, f.tb, f.tsh, -1, 1), cor(S, f.tb, f.tsh, 1, 1)) : Math.min(cor(S, f.fb, f.pb, -1, 1), cor(S, f.fb, f.pb, 1, 1));
      const a = q.arb && q.arb.find(x => x.joint === "ankle_" + s);
      ch[s] = [r4(heel), r4(toe), r2(Math.atan2(fz[1], Math.hypot(fz[0], fz[2])) * 57.2958), q.mtp ? r2(q.mtp[s].a * 57.2958) : null, q.mtp ? r2(q.mtp[s].tau) : null, a ? r2(a.real[1]) : null, r2((q.feet[s].load || 0) / W)]; }
    frames.push({ t: r4(q.t), b: q.states.map(s => [...s.pos.map(r4), ...s.rot.map(r4)]), com: q.com ? q.com.map(r4) : null, ch }); }
  const ev = (P ? P.exec.done : []).filter(d => d.kind === "rhythmic").map(d => ({ k: d.stepIndex, sw: d.sw, tSw0: r4(d.tSw0), lift: d.liftoff ? r4(d.liftoff.t) : null, td: d.td ? r4(d.td.t) : null, uAt: d.td && d.td.uAt != null ? r2(d.td.uAt) : null, status: d.status }));
  const out = { ...meta, channels: ["heel", "toeClr", "pitch", "mtp", "mtpTau", "ankleTau", "loadBW"], bodies, events: ev, frames };
  fs.writeFileSync(file, "(window.FG_RUNS = window.FG_RUNS || []).push(" + JSON.stringify(out) + ");\n");
  return { frames: frames.length, bytes: fs.statSync(file).size };
}
