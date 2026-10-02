import { walk, f3, W, spec, M, bi } from "./lib.mjs";
const { Q } = M; const COND = { df: 0.237, dl: 0.368, T: 0.45 };
const r = walk({ n: 4, seconds: 2.8, keep: true, walk: { char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.37 } } } });
const d = r.LOCO.planner.exec.done.filter(x => x.kind === "rhythmic"), s = d[1].sw, fb = bi("foot_" + s), sb = bi("shin_" + s), td = d[1].td.t;
const pitch = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])) * 57.3; };
const jn = (n) => n; 
for (const q of r.recs.filter(q => q.t >= td - 0.03 && q.t < td + 0.14)) { const F = q.feet[s], st = q.states[fb], a = q.arb.find(e => e.joint === "ankle_" + s), k = q.arb.find(e => e.joint === "knee_" + s), h = q.arb.find(e => e.joint === "hip_" + s);
  const tm = (e, i) => e ? e.terms.map(t => `${t.m.split(" ")[0].slice(0, 6)}:${(Array.isArray(t.alw ?? t.req) ? (t.alw ?? t.req)[i] : (t.alw ?? t.req)).toFixed(0)}`).join(" ") : "";
  console.log(`t+${f3(q.t - td)} ${q.rhythm.stage}/${q.exec ? q.exec.stage : "-"} h${F.heel ? 1 : 0}t${F.toe ? 1 : 0} load ${f3(F.load / W, 2)} vy ${f3(st.v[1], 2)} pitch ${f3(pitch(st.rot), 1)} pel y ${f3(q.states[0].pos[1], 3)} vy ${f3(q.states[0].v[1], 2)} | ank flex real ${a ? f3(a.real[1], 0) : "-"} [${tm(a, 1)}] | knee real ${k ? f3(k.real, 0) : "-"} [${tm(k, 0)}] | hip flex ${h ? f3(h.real[1], 0) : "-"}`); }
