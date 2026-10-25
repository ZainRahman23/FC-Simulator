// occupy3b/tools/l3_flagship.mjs — §9 THE MANDATORY REGRESSION: the audit's failure — equal-speed side by side, a thigh brush, the bodies closing at
// ≈ 0.20 m/s — OLD STAGE 3 against STAGE 3B, the same inputs, with the numerical accounting:
//   OLD: each limb strike (Stage 3's queue: its impulse vector at its point), its source (the limbs' articulated closing × the limbs' effective
//        masses), the limb's own speed BEFORE and AFTER it (unchanged: the animation continues — the momentum came from nowhere), the impulse's
//        component along the carrier's heading, the lead the impact's own root shifts made (ATT − DEF along his heading)
//   3B:  each contact application: the contact points' closing on the stable normal, the effective masses (limb yielding / body), λ (≤ the closing ×
//        the reduced mass: the bound), the limb's normal speed removed (w λ — the momentum it lost is λ), the energy before / after, the impulse's
//        component along the heading, the lead; the ledger (Stage 3 took exactly what it was given; the pairing)
//   node l3_flagship.mjs [--id side] [--json f]
import { ENV, runO3, arg, DT, hyp } from "./l3_common.mjs";
import { L3CASES } from "../l3_cases.js";
import fs from "node:fs";
const ID = arg("id", "side"), tc = L3CASES.find((x) => x.id === ID), out = { id: ID, name: tc.name };
const headAt = (W, t) => { const s = W.att.stateAt(t); return [Math.cos(s.psi), Math.sin(s.psi)]; };
// (the pair's MEAN heading: the symmetric axis — the carrier's own heading is 6–7° off it when he leans in, so a purely lateral push has a component
// along it for each player, opposite in sign: an apparent "lead" that is the lateral separation seen on a rotated axis)
const meanAt = (W, t) => { const a = W.att.stateAt(t).psi, d = W.def.stateAt(t).psi, x = Math.cos(a) + Math.cos(d), y = Math.sin(a) + Math.sin(d), m = Math.hypot(x, y) || 1; return [x / m, y / m]; };
function leadOf(W, t0, along = headAt) { const own = [0, 0]; let mx = 0; const log = W.imp ? W.imp.log : []; for (const r of log) { const h = along(W, r.t); (r.p || []).forEach((q, i) => { if (q && q.root) own[i] += q.root[0] * h[0] + q.root[1] * h[1]; }); mx = Math.max(mx, Math.abs(own[0] - own[1])); } return { att: own[0], def: own[1], lead: own[0] - own[1], maxLead: mx }; }
// ── OLD STAGE 3 ──
{ const strikes = [], seen = new Set(); const R = runO3(ENV, tc, "S3", { record: false, onTick: (W) => { const ep = W.imp.ep; if (!ep || !ep.queue) return; for (const q of ep.queue) if (!seen.has(q)) { seen.add(q); const h = headAt(W, W.att.t), rec = W.imp.log[W.imp.log.length - 1], st = rec && rec.strike && rec.strike[rec.strike.length - 1];
      strikes.push({ t: +(W.att.t).toFixed(4), J: q.J.slice(), at: q.c.slice(), fwd: q.J[0] * h[0] + q.J[1] * h[1], lat: -q.J[0] * h[1] + q.J[1] * h[0], pair: st && st.pair, art: st && st.art, mA: st && st.mA, mD: st && st.mD, j: st && st.j }); } } });
  const W = R.W, ep = W.imp.episodes[0], L = leadOf(W, R.t0), LM2 = leadOf(W, R.t0, meanAt); out.OLD = { strikes: strikes.map((s) => Object.assign(s, { t: +(s.t - R.t0).toFixed(3), fwdMean: undefined })), onset: ep && ep.onset && ep.onset.contact, players: ep && ep.players, lead: L, leadMean: LM2, t0: R.t0 };
  console.log(`THE FLAGSHIP — ${ID}: ${tc.name}`); console.log(`\nOLD STAGE 3 (limb strikes from the animated limb speed):`);
  if (ep) console.log(`  onset ${(ep.t0 - R.t0).toFixed(3)} s · ${ep.why} · the bodies closing ${ep.onset.contact.closing} m/s (root velocities on the local normal [${ep.onset.contact.normal}])`);
  for (const s of strikes) console.log(`  STRIKE ${s.pair} at ${s.t.toFixed(3)} s: articulated closing ${s.art} m/s × reduced mass of the limbs (${s.mA} / ${s.mD} kg) = ${s.j} N·s · its vector [${s.J.map((v) => v.toFixed(2))}] — along the carrier's heading ${s.fwd.toFixed(2)} N·s, across ${s.lat.toFixed(2)} N·s · the striking limb's own speed after it: UNCHANGED (the animation continues; Stage 3 never moves a limb)`);
  console.log(`  the impact's own root shifts along the carrier's heading: ATT ${(L.att * 100).toFixed(1)} cm · DEF ${(L.def * 100).toFixed(1)} cm → a LEAD of ${(L.lead * 100).toFixed(1)} cm (largest ${(L.maxLead * 100).toFixed(1)} cm)`);
  console.log(`  … along the pair's MEAN heading (the symmetric axis): ATT ${(LM2.att * 100).toFixed(1)} cm · DEF ${(LM2.def * 100).toFixed(1)} cm → a LEAD of ${(LM2.lead * 100).toFixed(1)} cm (largest ${(LM2.maxLead * 100).toFixed(1)} cm)`);
  if (ep) for (const k of ["ATT", "DEF"]) { const q = ep.players[k]; if (q) console.log(`  ${k}: ${q.sev} · ${q.cls} · Δv ${q.du} m/s · ${q.steps.length ? q.steps.length + " step(s)" : "no step"}`); } }
// ── STAGE 3B ──
{ const R = runO3(ENV, tc, "S3B", { record: false }), W = R.W, L = leadOf(W, R.t0), LM2 = leadOf(W, R.t0, meanAt), C = W.l3.check; const apps = W.l3.apps.map((a) => { const h = headAt(W, a.k * DT), hm = meanAt(W, a.k * DT), J = a.n.slice(0, 2).map((v) => v * a.lam);
    return { t: +(a.k * DT - R.t0).toFixed(3), pair: a.key, region: a.region, held: a.held, closing: -a.vn, wA: a.wA, wB: a.wB, mu: 1 / (a.wA + a.wB), lam: a.lam, bound: a.src, dvA: a.dvnA, dvB: a.dvnB, keB: a.keB, keA: a.keA, n: a.n.slice(0, 2), fwd: J[0] * h[0] + J[1] * h[1], fwdMean: J[0] * hm[0] + J[1] * hm[1], lat: -J[0] * h[1] + J[1] * h[0], route: a.routeA + " / " + a.routeB, artA: a.artA, artB: a.artB }; });
  const ep = W.imp.episodes[0]; out.S3B = { apps, players: ep && ep.players, lead: L, leadMean: LM2, check: C, acc: W.l3.acc };
  console.log(`\nSTAGE 3B (the limb contact: only what the limb actually lost):`);
  for (const a of apps) console.log(`  ${a.held ? "held  " : "STRIKE"} ${a.pair} (${a.region}) at ${a.t.toFixed(3)} s: the contact points closing ${a.closing.toFixed(2)} m/s on the stable normal [${a.n.map((v) => v.toFixed(3))}] · effective masses ${(1 / a.wA).toFixed(1)} / ${(1 / a.wB).toFixed(1)} kg (${a.route}) → λ ${a.lam.toFixed(2)} N·s (bound ${a.bound.toFixed(2)}) · the limbs' normal speed removed ${a.dvA != null ? a.dvA.toFixed(2) : "—"} / ${a.dvB != null ? a.dvB.toFixed(2) : "—"} m/s · energy ${a.keB.toFixed(2)} → ${a.keA.toFixed(3)} J · along the heading ${a.fwd.toFixed(3)} N·s, across ${a.lat.toFixed(2)} N·s`);
  const sF = apps.reduce((s, a) => s + a.fwd, 0), sL = apps.reduce((s, a) => s + a.lat, 0), sJ = apps.reduce((s, a) => s + a.lam, 0);
  console.log(`  Σ ${apps.length} applications: ${sJ.toFixed(2)} N·s · along the carrier's heading ${sF.toFixed(3)} N·s (each player's equal and opposite: the bodies' headings differ by ${(Math.abs(W.att.stateAt(R.t0 + 1).psi - W.def.stateAt(R.t0 + 1).psi) * 180 / Math.PI).toFixed(1)}°) · across ${sL.toFixed(2)} N·s`);
  console.log(`  … along the pair's MEAN heading: Σ of the applications ${apps.reduce((s, a) => s + a.fwdMean, 0).toFixed(4)} N·s (the stable normal is perpendicular to it)`);
  console.log(`  the impact's own root shifts along the carrier's heading: ATT ${(L.att * 100).toFixed(1)} cm · DEF ${(L.def * 100).toFixed(1)} cm → a LEAD of ${(L.lead * 100).toFixed(1)} cm (largest ${(L.maxLead * 100).toFixed(1)} cm)`);
  console.log(`  … along the pair's MEAN heading (the symmetric axis): ATT ${(LM2.att * 100).toFixed(1)} cm · DEF ${(LM2.def * 100).toFixed(1)} cm → a LEAD of ${(LM2.lead * 100).toFixed(1)} cm (largest ${(LM2.maxLead * 100).toFixed(1)} cm)`);
  console.log(`  THE LEDGER: Stage 3 took exactly what it was given (max ${C.stage3.toExponential(1)} N·s) · every impulse paired (max ${C.pair.toExponential(1)}) · no impulse above its closing's bound (max excess ${C.bound.toExponential(1)}) · no energy gained by a contact (max ${C.energy.toExponential(1)} J) · OLD limb strikes left: ${W.imp.events.filter((e) => /LIMB STRIKE/.test(e.kind)).length}`);
  for (const k of ["ATT", "DEF"]) { const a = W.l3.acc[k]; console.log(`  ${k}: Σ 3B ${a.EXT3B.map((v) => v.toFixed(2))} N·s · Stage 3 body contact ${a.S3_BODY.map((v) => v.toFixed(2))} · ground (strut ${a.STRUT.map((v) => v.toFixed(2))}, balance ${a.BALANCE.map((v) => v.toFixed(2))})`); }
  if (ep) for (const k of ["ATT", "DEF"]) { const q = ep.players[k]; if (q) console.log(`  ${k}: ${q.sev} · ${q.cls} · Δv ${q.du} m/s · ${q.steps.length ? q.steps.length + " step(s)" : "no step"}`); } }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
