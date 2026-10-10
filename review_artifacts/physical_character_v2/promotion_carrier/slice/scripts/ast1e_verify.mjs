// AST1E_PREREG.md (7b77dc5 + A1 bc12611) §4 items 2, 5, 6 and R-1 / R-2 / R-4 on the verification runs (REV2 runner plant, AST-1E, no-tackler variant: no contact).
// usage (worktree root, V13_WT …): node ast1e_verify.mjs <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import crypto from "crypto"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../.."), SL = path.resolve(here, "..");
const M = await import(path.join(ROOT, "pi1/rev1/scripts/pcg_rev1.mjs")), M0 = await import(path.join(ROOT, "pi1/trackB/scripts/pcg_f0.mjs")); const { SEGMAP, ADJ } = M; const { V, loadAir } = M.L;
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), sim2r = (p) => [p[0], p[2], -p[1]], r2sim = (p) => [p[0], -p[2], p[1]], segR = (g, t) => (g.ra != null ? g.ra + (g.rb - g.ra) * Math.max(0, Math.min(1, t)) : g.r);
const RECS = path.join(ROOT, "promotion_carrier/evidence/records/on_rx"), FAR = [0, 0, 500], out = { prereg: "AST1E_PREREG.md 7b77dc5 + A1 bc12611", cases: {} }; let allOK = true;
const RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 };
for (const cs of ["rx_miss", "rx_free_leg", "rx_planted_leg"]) { const R = loadAir(RECS, `${cs}_LOCO.json.gz`), run = rd(path.join(SL, `evidence/${process.env.VERIFY_DIR || "ast1e"}/verify_${cs}_free_rev2.json.gz`)), off = run.handoff.off, kp = run.kp, tauP = kp + 1;
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), cl = (e) => e.react || e.cls, fin = ev.reduce((m, e) => (RANK[cl(e)] > RANK[m] ? cl(e) : m), "NEGLIGIBLE"), dec = ev.find(e => cl(e) === fin) || null, tRef = run.tRef;
  const order = R.prims[kp][3].map(p => p.prim), isLeg = (n) => n === "LEG" || n === "THIGH", segPrims = { LEG: order.filter(isLeg), TORSO: order.filter(n => !isLeg(n)) }, rad = Object.fromEntries(R.prims[kp][3].map(p => [p.prim, p.r]));
  const primAt = (tau) => { const k = Math.min(R.prims.length - 1, Math.max(0, Math.ceil(tau - 1e-9) - 1)), n = Math.max(1, Math.min(4, Math.round((tau - k) * 4))); return Object.fromEntries(R.prims[k][n - 1].map(p => [p.prim, p])); };
  // item 2: LEG-segment endpoint error vs the record, (τ_p, τ_ref] while prescribed; AST-C1 over both segments
  let legErr = 0, legWho = null, allErr = 0, nCmp = 0; const relTau = run.standInInfo.release ? run.standInInfo.release.tau : Infinity;
  for (const s of run.stepsLog) { if (s.tau > tRef + 1e-9 || s.tau >= relTau - 1e-9) continue; const P = primAt(s.tau);
    for (const g of s.si) { const prims = segPrims[g.n]; prims.forEach((pn, j) => { for (const [e, idx] of [["a", 2 * j], ["b", 2 * j + 1]]) { const au = V.add(V.sub(sim2r(P[pn][e]), off), FAR), d = V.dist(au, g.pts[idx]); allErr = Math.max(allErr, d); if (g.n === "LEG" && d > legErr) { legErr = d; legWho = { tau: s.tau, prim: pn, end: e }; } nCmp++; } }); } }
  const item2 = { window: [tauP, tRef], comparisons: nCmp, legMaxErrMm: +(legErr * 1000).toFixed(4), legWorst: legWho, standInAllMaxErrMm: +(allErr * 1000).toFixed(4), pass: legErr <= 0.010 };
  // R-1 / R-2 / R-4 (no contact here: the release is rule (b) for the contact records; none for rx_miss)
  const rel = run.standInInfo.release, after = run.stepsLog.filter(s => s.tau > (rel ? rel.tau : Infinity) + 1e-9);
  const r1 = after.every(s => { const g = s.si.find(x => x.n === "LEG"); return g && g.rel === 1 && g.drv && g.drv.F.every(x => x === 0) && g.drv.T === 0 && g.drv.lt.every(x => x === 0) && g.drv.lr === 0; });
  const R1 = { releaseTau: rel ? rel.tau : null, why: rel ? rel.why : null, stepsAfter: after.length, pass: rel ? r1 : true }, R2 = { stateUnchangedAtRelease: rel ? rel.stateUnchanged : null, pass: rel ? rel.stateUnchanged === true : true };
  // item 6: the stand-in capsules (shifted back) swept against the simulation's own runner segments
  const capsAt = (s) => { const caps = []; for (const g of s.si) segPrims[g.n].forEach((pn, j) => { const a = r2sim(V.add(V.sub(g.pts[2 * j], FAR), off)), b = r2sim(V.add(V.sub(g.pts[2 * j + 1], FAR), off)); caps.push({ prim: pn, seg: g.n, a, b, r: rad[pn] }); }); return caps; };
  const pens = (s) => { const k = Math.ceil(s.tau - 1e-9) - 1, n = Math.round((s.tau - k) * 4), sb = R.simBody[k] && R.simBody[k][n - 1]; if (!sb) return []; const res = [];
    for (const c of capsAt(s)) for (const g of sb.segs) { const cc = M0.SIMV.segseg(c.a, c.b, g.a, g.b), pen = c.r + segR(g, cc.t) - cc.d; if (pen > 0) res.push({ tau: s.tau, prim: c.prim, standInSeg: c.seg, runnerSeg: g.name, penMm: +(pen * 1000).toFixed(2), Q: cc.Q, sb }); } return res; };
  const jointOf = (sb, mapped, jn) => { const sd = mapped.slice(-1), shin = sb.segs.find(g => g.name === "shin_" + sd); return jn === "ankle" ? shin.b : shin.a; };
  const okSeg = (p, sg) => { const mg = SEGMAP[sg], mp = SEGMAP[p.runnerSeg]; if (!mg || !mp) return false; if (mp === mg) return true; for (const [b2, jn] of ADJ[mg] || []) if (b2 === mp) { const jp = jointOf(p.sb, mg, jn); if (Math.hypot(p.Q[0] - jp[0], p.Q[1] - jp[1], p.Q[2] - jp[2]) <= 0.030) return true; } return false; };
  const allPens = run.stepsLog.flatMap(pens); let item6;
  if (!ev.length) { const win = allPens.filter(p => p.tau >= tauP - 1e-9 && p.tau <= tRef + 12 + 1e-9); item6 = { kind: "near miss", window: [tauP, tRef + 12], penetrations: win.length, first: win[0] ? { tau: win[0].tau, prim: win[0].prim, runnerSeg: win[0].runnerSeg, penMm: win[0].penMm } : null, pass: win.length === 0 }; }
  else { const t1 = ev[0].tick - 1 + ev[0].sub / 4, early = allPens.filter(p => p.tau < t1 - 1 - 1e-9), checks = [];
    const targets = [ev[0]].concat(dec && dec !== ev[0] ? [dec] : []);
    for (const e of targets) { const tg = e.tick - 1 + e.sub / 4, hits = allPens.filter(p => p.tau >= tg - 1 - 1e-9 && p.tau <= tg + 1 + 1e-9 && p.prim === e.prim && okSeg(p, e.seg));
      checks.push({ contact: e === dec ? (e === ev[0] ? "first = decisive" : "decisive") : "first", tSim: tg, seg: e.seg, prim: e.prim, react: cl(e), hits: hits.length, firstHit: hits[0] ? { tau: hits[0].tau, runnerSeg: hits[0].runnerSeg, penMm: hits[0].penMm, dTicks: +(hits[0].tau - tg).toFixed(2) } : null, pass: hits.length > 0 }); }
    item6 = { kind: "contact", earlyPenetrations: early.length, earlyFirst: early[0] ? { tau: early[0].tau, prim: early[0].prim, runnerSeg: early[0].runnerSeg } : null, checks, pass: early.length === 0 && checks.every(c => c.pass) }; }
  const R4 = { consts: run.standInInfo.consts, Lext: run.standInInfo.Lext, L0: run.standInInfo.L0, masses: run.standInInfo.masses };
  const ok = item2.pass && R1.pass && R2.pass && item6.pass && run.kp === { rx_miss: 47, rx_free_leg: 39, rx_planted_leg: 38 }[cs]; allOK = allOK && ok;
  out.cases[cs] = { kp, leadTicks: run.leadTicks, item2, R1, R2, R4, item6, pass: ok };
  console.log(cs.padEnd(15), "k_p", kp, "lead", run.leadTicks, "| item 2 LEG max err", item2.legMaxErrMm, "mm (all", item2.standInAllMaxErrMm + ")", item2.pass ? "pass" : "FAIL", "| release", R1.releaseTau, R1.why, "R-1", R1.pass, "R-2", R2.pass, "| item 6", item6.kind, item6.pass ? "pass" : "FAIL", JSON.stringify(item6.checks ? item6.checks.map(c => [c.contact, c.seg, c.firstHit]) : item6.first)); }
// item 5: hashes
{ const sums = fs.readFileSync(path.join(ROOT, "promotion_carrier/evidence/records/SHA256SUMS"), "utf8").trim().split("\n").map(l => l.split(/\s+/)); let shaOK = true;
  for (const [h, f] of sums) { const d = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "promotion_carrier/evidence/records", f))).digest("hex"); if (d !== h) shaOK = false; }
  const S = (set) => JSON.parse(fs.readFileSync(path.join(ROOT, `locomotion_continuity/evidence/exports/${set}/rx/air_summary.json`))).summary, idn = JSON.parse(fs.readFileSync(path.join(ROOT, "locomotion_continuity/evidence/identity.json")));
  const g = {}; let gOK = true; for (const cs of ["rx_miss", "rx_free_leg", "rx_planted_leg"]) { const hs = {}; for (const set of ["on", "off"]) for (const [m, v] of Object.entries(S(set)[cs] || {})) if (v && v.gameplayHash) hs[set + "." + m] = v.gameplayHash; const lc7 = idn.LC7["rx/" + cs]; if (lc7) Object.assign(hs, lc7.hashes);
    const u = [...new Set(Object.values(hs))]; g[cs] = { hashes: hs, identical: u.length === 1 }; gOK = gOK && u.length === 1; }
  out.item5 = { recordsSha256Unchanged: shaOK, gameplayHashes: g, pass: shaOK && gOK }; allOK = allOK && out.item5.pass; console.log("item 5: records SHA-256 unchanged", shaOK, "| gameplay hashes identical across modes and V1.3", gOK); }
out.pass = allOK; fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log("AST-1E verification", allOK ? "PASS" : "FAIL");
