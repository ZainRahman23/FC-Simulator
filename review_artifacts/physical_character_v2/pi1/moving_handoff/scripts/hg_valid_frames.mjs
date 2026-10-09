// MOVING-HANDOFF INVESTIGATION (read-only): every pre-contact frame of each record evaluated against the full handoff gate as now adopted
// (REV2 rows P-1 … P-17, HG-T, HG-D-equivalent determinism not re-run, HG-A v2 |s| <= 0.180 m/s). Lists the valid promotion frames anywhere in the
// pre-contact run (not only in the PS-2 window) and their leads, so the drift study can start from valid states.
// usage (worktree root): V13_WT=<v1.3> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../hg_valid_frames.mjs <airDir> <out.json> <case,...>
import fs from "fs";
const M = await import(new URL("../../rev1/scripts/pcg_rev1.mjs", import.meta.url).href), M0 = await import(new URL("../../trackB/scripts/pcg_f0.mjs", import.meta.url).href);
const { L, makeMapper, geomRowsRev1, rigGeom, angVel } = M; const { V, Q, B, NB, loadAir } = L;
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), Mt = B.reduce((s, b) => s + b.mass, 0), comVel = (v) => V.sc(v.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt);
function initVel(mapper, k) { const S2 = mapper.poseAt(k).S, S1 = mapper.poseAt(k - 1).S, S0 = mapper.poseAt(k - 2).S, w = [], v = [];
  for (let i = 0; i < NB; i++) w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5));
  v[0] = V.sub(V.sc(V.sub(comW(S2, 0), comW(S1, 0)), 1.5 * 60), V.sc(V.sub(comW(S1, 0), comW(S0, 0)), 0.5 * 60));
  for (const j of L.spec.joints) { const p = j.parentIndex, c = j.childIndex, jp = S2[c].pos, vj = V.add(v[p], V.cross(w[p], V.sub(jp, comW(S2, p)))); v[c] = V.add(vj, V.cross(w[c], V.sub(comW(S2, c), jp))); }
  return { v, w, S: S2 }; }
const [AIRDIR, OUT, CASES] = process.argv.slice(2), out = {};
for (const cs of CASES.split(",")) { const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), G = rigGeom(R), mapper = makeMapper(R, { knee: "RK", rf1: true });
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = R.pred.findIndex(x => x != null && x <= 0.25); let kend, tRef;
  if (first) { kend = first.tick - 2; tRef = first.tick - 1 + first.sub / 4; } else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } kend = kc - 1; tRef = kc + 0.5; }
  const fr = [], cnt = {}; for (let k = 8; k <= kend; k++) { const g = geomRowsRev1(R, k, k - 6, mapper, G), fails = g.fails.slice(); const p5 = Math.max(g.foot.L.physVsPresDeg, g.foot.R.physVsPresDeg); if (p5 > 5) fails.push("P5_footDeg");
    const kin = M0.kinRows(R, k, mapper.poseAt); fails.push(...kin.fails); const iv = initVel(mapper, k), vc = comVel(iv.v), row = R.rows[k], s = Math.hypot(vc[0] - row[10], vc[2] + row[11]); if (s > 0.180) fails.push("HGAv2_shift");
    const d = R.def[k]; const hgt = !!(d && d.kind === "SLIDE" && d.launchT >= R.slide.extT - 1e-9);
    for (const x of fails) cnt[x] = (cnt[x] || 0) + 1; fr.push({ k, lead: +(tRef - (k + 1)).toFixed(2), s: +s.toFixed(3), vY: +vc[1].toFixed(3), fails, hgt, valid: !fails.length }); }
  const valid = fr.filter(x => x.valid); out[cs] = { trigger: kt, kend, tRef, speed: Math.hypot(R.rows[kend][10], R.rows[kend][11]), frames: fr.length, valid: valid.map(x => ({ k: x.k, lead: x.lead, s: x.s, vY: x.vY, hgt: x.hgt })), failCounts: cnt };
  console.log(cs.padEnd(18), "speed", out[cs].speed.toFixed(2), "frames", fr.length, "valid", valid.length, valid.map(x => x.k + "(" + x.lead + (x.hgt ? "" : ",noHGT") + ")").join(" "), "| top fails", Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, b]) => a + ":" + b).join(" ")); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
