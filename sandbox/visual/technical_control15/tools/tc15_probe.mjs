// technical_control15/tools/tc15_probe.mjs — a quick numerical look at one reference (development aid): the contacts, the stances, the centre of
// mass at key times, and per-frame diagnostics (clearances, the ball against the boots, the reach adaptation, the ankle's orientation error).
//   node tc15_probe.mjs CHOP90
import { makeRef } from "./tc15_env.mjs";
const id = process.argv[2] || "CHOP90", r = makeRef(id).run(), f3 = (x) => (x == null ? "—" : (+x).toFixed(3)), L = (p) => r.P2L(p).map((x) => x.toFixed(3)).join(", ");
console.log(`${id}: ${r.T.label} · ${r.rec.length} frames`);
for (const c of r.contacts) console.log(`contact ${c.i} t ${c.t.toFixed(3)} ${c.F} ${c.surface} ${c.role} ball [${L(c.ball)}] h ${c.ball[2].toFixed(3)} vIn ${Math.hypot(...c.vIn).toFixed(2)} → vOut ${c.speedOut.toFixed(2)} @ ${c.outDeg.toFixed(1)}° · impulse ${(Math.atan2(c.n[1], c.n[0]) / Math.PI * 180).toFixed(0)}° ${c.dv.toFixed(2)} m/s · foot yaw ${c.pose ? (c.pose.yaw / Math.PI * 180).toFixed(0) : "—"}° ank [${c.pose ? L(c.pose.ank) : "—"}] h ${c.pose ? c.pose.ank[2].toFixed(3) : "—"}`);
for (const X of ["R", "L"]) for (const s of r.st[X]) console.log(`stance ${X} ${s.t0.toFixed(2)}–${s.t1.toFixed(2)} at [${s.at.map((x) => x.toFixed(3)).join(", ")}] yaw ${s.yawD.toFixed(0)} · com then [${r.comL(s.t0).map((x) => x.toFixed(2)).join(", ")}] ${s.kind || ""}`);
for (const t of [0.9, 1.0, 1.13, 1.26, 1.30, 1.35, 1.42, 1.47, 1.6, 1.7, 2.0]) { const b = r.ballL(t), c = r.comL(t), V = r.vel(t); console.log(`t ${t.toFixed(2)} com [${c.map((x) => x.toFixed(2))}] v ${Math.hypot(...V).toFixed(2)} @ ${(Math.atan2(V[1], V[0]) / Math.PI * 180).toFixed(0)} · ball [${b.map((x) => x.toFixed(2))}] rel com [${(b[0] - c[0]).toFixed(2)}, ${(b[1] - c[1]).toFixed(2)}] · phase ${r.phaseAt(t)}`); }
// per-frame: leg clearances (tc13's capsules), the ball against each boot outside the contact frames, the reach adaptation, the ankle's orientation error
const RAD = { thigh: 0.075, shin: 0.052, boot: 0.048, knee: 0.06 }, sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function segDist(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), rr = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, rr); let s, t; const cl = (x) => Math.max(0, Math.min(1, x));
  if (a <= 1e-12 && e <= 1e-12) return Math.hypot(...rr); if (a <= 1e-12) { s = 0; t = cl(f / e); } else { const c = dot(d1, rr); if (e <= 1e-12) { t = 0; s = cl(-c / a); } else { const b = dot(d1, d2), den = a * e - b * b; s = den !== 0 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } } }
  return Math.hypot(...sub([p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t])); }
const worst = {}, bump = (k, v, t) => { if (!worst[k] || v < worst[k].v) worst[k] = { v, t }; };
let reachMax = { v: 0, t: 0 }, errMax = { v: 0, t: 0, X: "" };
for (const q of r.rec) { const J = q.J, g = (n) => J[n].j, tp = (n) => J[n].t, Lb = {}; for (const X of ["R", "L"]) Lb[X] = { hip: g("thigh_" + X), knee: g("shin_" + X), ankle: g("foot_" + X), toe: tp("toe_" + X) };
  bump("boot/boot", segDist(Lb.R.ankle, Lb.R.toe, Lb.L.ankle, Lb.L.toe) - 2 * RAD.boot, q.t); bump("shin/shin", segDist(Lb.R.knee, Lb.R.ankle, Lb.L.knee, Lb.L.ankle) - 2 * RAD.shin, q.t); bump("thigh/thigh", segDist(Lb.R.hip, Lb.R.knee, Lb.L.hip, Lb.L.knee) - 2 * RAD.thigh, q.t);
  bump("boot/calf", Math.min(segDist(Lb.R.ankle, Lb.R.toe, Lb.L.knee, Lb.L.ankle), segDist(Lb.L.ankle, Lb.L.toe, Lb.R.knee, Lb.R.ankle)) - RAD.boot - RAD.shin, q.t);
  const near = r.contacts.some((c) => Math.abs(c.t - q.t) < 0.006); if (!near) for (const X of ["R", "L"]) bump("ball/boot " + X, q.gap[X].gap, q.t);
  if (q.reach > reachMax.v) reachMax = { v: q.reach, t: q.t }; for (const X of ["R", "L"]) if (q.legA[X].err > errMax.v) errMax = { v: q.legA[X].err, t: q.t, X }; }
for (const [k, w] of Object.entries(worst)) console.log(`min ${k}: ${(w.v * 100).toFixed(1)} cm at ${w.t.toFixed(3)} s`);
console.log(`reach adaptation max ${(reachMax.v * 100).toFixed(1)} cm at ${reachMax.t.toFixed(3)} · ankle orientation error max ${errMax.v.toFixed(1)}° (${errMax.X}) at ${errMax.t.toFixed(3)}`);
