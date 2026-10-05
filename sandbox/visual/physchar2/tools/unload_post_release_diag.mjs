// ═══ physchar2/tools/unload_post_release_diag.mjs — DIAGNOSTIC (not adopted): why does the released, unloaded foot leave the turf by itself after release
// in B1B3 at drops ≥ 1 cm (unloading characterization)? Same scenario as tools/unload_char.mjs (gates/v2_unload.js). From 6.0 s, per tick: lifecycle state /
// s / a of the unloading foot, its touching pieces and sensed load, its origin height and minimum sole clearance (lowest boot point above y = 0), the
// TOUCHING hold's target height (the lifecycle target and the controller's contact rule: in contact with no swing command the target height FOLLOWS THE
// FOOT), pelvis posture target height vs actual. Optional extra controller options (the lifecycle's existing DIAGNOSTIC switches, e.g. lcFrameH) as
// one-at-a-time counterfactuals.
// usage: node tools/unload_post_release_diag.mjs [--body=V2-REF] [--foot=L] [--drop=0.025] [--extra=<json>] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const BODY = arg("body", "V2-REF"), FOOT = arg("foot", "L"), DROP = +arg("drop", 0.025), EXTRA = JSON.parse(arg("extra", "{}")), OUT = arg("out", "");
const spec = unloadSpec(BODY), run = { foot: FOOT, drop: DROP, r: 0, flags: { ffLockedAxis: true, shareCap: true, ...EXTRA }, end: 11 }, { s, nL } = unloadSim(J, spec, run), C = s.ctrl, B = spec.bodies;
const f = C.feet[nL], pel = B.findIndex(b => b.name === "pelvis"), pts = B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos)));
const clear = (st) => Math.min(...pts.map(p => V.add(st[f].pos, Q.rot(st[f].rot, p))[1])) * 1000, rows = []; let y0 = null;
while (s.tick()) { const t = s.n * s.dt, st = s.st, lf = C.lc.feet[nL]; if (t < 6.0) continue; if (y0 == null) y0 = st[f].pos[1];
  const tg = C.lc.target(nL); rows.push({ t: +t.toFixed(4), st: lf.state, s: lf.s, a: lf.a, touch: C.sense.touch[nL], Fz: C.sense.Fz[nL], footDyMm: (st[f].pos[1] - y0) * 1000, clearMm: clear(st), anchorDyMm: tg ? (tg.pos[1] - y0) * 1000 : null, pelTarget: C.pelHT, pelActual: st[pel].pos[1], pelErrMm: (C.pelHT - st[pel].pos[1]) * 1000 }); }
s.destroy();
const tr = []; for (let i = 1; i < rows.length; i++) if (rows[i].st !== rows[i - 1].st) tr.push(`${rows[i].t.toFixed(3)} ${rows[i - 1].st}→${rows[i].st}`);
const firstAir = rows.find(r => r.st === "LIFTOFF" || r.st === "AIRBORNE"), relI = rows.findIndex(r => r.st === "UNLOADING");
const at = (t) => rows.find(r => r.t >= t - 1e-9) || rows[rows.length - 1], f2 = (x, d = 3) => (x == null ? "—" : x.toFixed(d));
console.log(`${BODY} ${FOOT} drop ${DROP * 100} cm extra ${JSON.stringify(EXTRA)}: release ${relI >= 0 ? rows[relI].t : "—"}; first loss of contact ${firstAir ? firstAir.t : "none"}; AIRBORNE entries ${tr.filter(x => /→AIRBORNE/.test(x)).length}; transitions ${tr.slice(0, 8).join(" | ")}${tr.length > 8 ? " …" : ""}`);
for (const t of [6.4, 6.6, 6.8, 7.0, 7.2, 7.6, 8.0, 9.0, 10.0]) { const r = at(t); console.log(`   t ${r.t}: ${r.st.padEnd(10)} touch ${r.touch} Fz ${f2(r.Fz, 2)} N | foot Δy ${f2(r.footDyMm)} mm, sole clearance ${f2(r.clearMm)} mm, anchor Δy ${f2(r.anchorDyMm)} mm | pelvis target ${f2(r.pelTarget * 1000, 2)} actual ${f2(r.pelActual * 1000, 2)} mm (err ${f2(r.pelErrMm)})`); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ body: BODY, foot: FOOT, drop: DROP, extra: EXTRA, transitions: tr, rows }));
