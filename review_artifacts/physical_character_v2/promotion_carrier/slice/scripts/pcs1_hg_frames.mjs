// PCS-1 STOP diagnostic (read-only): the full REV2 handoff gate HG incl. HG-T (slide leg fully extended) on every pre-contact frame, LC-1 and V1.3 presentations.
// Identical handoff code to pcs1_run.mjs / scan_lc.mjs. usage (worktree root, V13_WT …): node pcs1_hg_frames.mjs <airDir> <label> <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../..");
const M = await import(path.join(ROOT, "pi1/rev1/scripts/pcg_rev1.mjs")), M0 = await import(path.join(ROOT, "pi1/trackB/scripts/pcg_f0.mjs"));
const { L, makeMapper, geomRowsRev1, rigGeom, angVel } = M; const { V, Q, B, NB, loadAir } = L;
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), Mt = B.reduce((s, b) => s + b.mass, 0), comVel = (v) => V.sc(v.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt);
function initVel(mapper, k) { const S2 = mapper.poseAt(k).S, S1 = mapper.poseAt(k - 1).S, S0 = mapper.poseAt(k - 2).S, w = [], v = [];
  for (let i = 0; i < NB; i++) w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5));
  v[0] = V.sub(V.sc(V.sub(comW(S2, 0), comW(S1, 0)), 1.5 * 60), V.sc(V.sub(comW(S1, 0), comW(S0, 0)), 0.5 * 60));
  for (const j of L.spec.joints) { const p = j.parentIndex, c = j.childIndex, jp = S2[c].pos, vj = V.add(v[p], V.cross(w[p], V.sub(jp, comW(S2, p)))); v[c] = V.add(vj, V.cross(w[c], V.sub(comW(S2, c), jp))); }
  return { v, w, S: S2 }; }
const [DIR, LABEL, OUT] = process.argv.slice(2), out = { label: LABEL, tackler: process.env.TACKLER || "ast1", cases: {} };
for (const cs of ["rx_miss", "rx_free_leg", "rx_planted_leg"]) { const R = loadAir(DIR, `${cs}_LOCO.json.gz`), G = rigGeom(R), mapper = makeMapper(R, { knee: "RK", rf1: true });
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = R.pred.findIndex(x => x != null && x <= 0.25); let kend, tRef;
  if (first) { kend = first.tick - 2; tRef = first.tick - 1 + first.sub / 4; } else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } kend = kc - 1; tRef = kc + 0.5; }
  const fr = []; let hgtFirst = null;
  for (let k = 8; k <= kend; k++) { const g = geomRowsRev1(R, k, k - 6, mapper, G), fails = g.fails.slice(); const p5 = Math.max(g.foot.L.physVsPresDeg, g.foot.R.physVsPresDeg); if (p5 > 5) fails.push("P5_footDeg");
    const kin = M0.kinRows(R, k, mapper.poseAt); fails.push(...kin.fails); const iv = initVel(mapper, k), vc = comVel(iv.v), row = R.rows[k], dA = Math.hypot(vc[0] - row[10], vc[2] + row[11]); if (dA > 0.180) fails.push("HGAv2_shift");
    const d = R.def[k], hgt = !!(d && d.kind === "SLIDE" && d.launchT >= R.slide.extT - 1e-9), hgtE = !!(d && d.kind === "SLIDE" && d.launchT != null && d.launchT > 0);   // HG-T for the stand-in in use (AST1E_PREREG §4 item 3); AST-1 condition always recorded
    if (process.env.TACKLER === "ast1e") { if (!hgtE) fails.push("HGT_AST1E"); } else if (!hgt) fails.push("HGT_extension"); if (hgt && hgtFirst == null) hgtFirst = k;
    fr.push({ k, lead: +(tRef - (k + 1)).toFixed(2), fails }); }
  const full = fr.filter(x => !x.fails.length), noHGT = fr.filter(x => x.fails.every(f => f === "HGT_extension" || f === "HGT_AST1E"));
  out.cases[cs] = { tRef, trigger: kt, kend, hgtFirstFrame: hgtFirst, hgtFirstLead: hgtFirst != null ? +(tRef - (hgtFirst + 1)).toFixed(2) : null, fullyValid: full.map(x => ({ k: x.k, lead: x.lead })), validExceptHGT: noHGT.filter(x => x.fails.length).map(x => ({ k: x.k, lead: x.lead })),
    latestFullyValidLeadGe6: (full.filter(x => x.lead >= 6).slice(-1)[0] || null), frames: fr };
  const c = out.cases[cs]; console.log(LABEL, cs.padEnd(15), "tRef", tRef, "| HG-T first passes at frame", hgtFirst, "(lead", c.hgtFirstLead + ")", "| fully valid (incl. HG-T):", full.map(x => x.k + "(" + x.lead + ")").join(" ") || "none", "| valid except HG-T:", c.validExceptHGT.map(x => x.k + "(" + x.lead + ")").join(" ") || "none", "| latest fully valid with lead >= 6:", c.latestFullyValidLeadGe6 ? c.latestFullyValidLeadGe6.k : "none"); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
