// dribble13/tools/d13_setupviz.mjs — SET-UP TOUCHES: intended target vs the BALL-PHYS prediction vs what actually happened (the owner's DRIBBLE-1.3
// review item E). For every launched set-up touch of the given runs: the set-up's intended target (the decisive corridor's max-margin point, tick of
// its window) and its planned decisive contact (tick, foot, surface); the free ball BALL-PHYS predicts at the decisive tick for the PLANNED launch and
// for the EXECUTED launch (execution error included); the ACTUAL ball there (the recorded run); the gaps between them; and what followed (the next
// touch, the decisive executed or not, the cut taken). The DRIBBLE-1.3 plan also carries its validation (the envelope margins).
// usage: node d13_setupviz.mjs "SCN1,SCN2" a b [ver d13] [out.json]          (D1OVR / D13CORE pass through)
import fs from "fs"; import { makeSim, PROFILES } from "./d13_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d13_quality.mjs";
const [idsA = "CUT60_RUN,CUT60L_RUN,CUT90_RUN,CUT90L_RUN", a = "1", b = "8", ver = "d13", outFile] = process.argv.slice(2), K = (x) => [x[0], x[1], -x[2]], rows = [];
for (const id of idsA.split(",")) for (let sd = +a; sd <= +b; sd++) {
  const scn = get(id), S = makeSim(scn, { ver, seed: sd, player: PROFILES.HIGH, opts: { record: true } }); const checks = new Map(), inst = S.installPlan ? S.installPlan.bind(S) : null;
  if (inst) S.installPlan = function (best, ...r) { const out = inst(best, ...r); if (this.plan && best.setupCheck) checks.set(this.plan.id, best.setupCheck); return out; };
  // (diagnostic, any core version with decisiveExists: the envelope test of DRIBBLE-1.3 applied to the set-up as it is committed — the decisive's
  // existence for the speed ±1σ / direction ±1σ executions)
  const envAt = new Map(), cm0 = S.commit.bind(S);
  S.commit = function (k, P) { if (P && P.setupSw && P.dec && this.decisiveExists) { try { const s = Math.hypot(this.A.V[0], this.A.V[1]), c = { F: P.F, reg: P.reg, release: P.release, setupSw: true }, sg = this.touchSigma(c, s), v0 = this.launchVec(P.launch, P.geom);
      const env = this.exec13.envelope(v0, sg).filter((e) => e.tag !== "nominal"), pr = P.pred, smD = pr.at(P.dec.kc - pr.k0 - 1), sw = smD && !smD.legs[P.dec.F].stance ? smD.legs[P.dec.F].swing : null;
      const uDec = [Math.cos(P.dec.dir), 0, -Math.sin(P.dec.dir)], res = env.map((e) => ({ tag: e.tag, exists: sw != null && this.decisiveExists(pr, P.dec.F, sw, P.dec.kc, uDec, this.simLaunch(P.ballP, e.v, Math.round(1.3 * 240)), k, s) }));
      envAt.set(P.id, res); } catch (e) { envAt.set(P.id, String(e)); } } return cm0(k, P); };
  S.run(); const q = cutQuality(S, scn), T = S.touches.filter((t) => t.launched);
  for (let i = 0; i < T.length; i++) { const t = T[i]; if (!(t.role === "setup" || t.setupSw)) continue; const dec = t.dec, nx = T[i + 1] || null, kd = dec ? dec.kc : t.desired.kNext;
    const sim = (v) => { const tr = S.simLaunch0(t.ball, v, Math.max(1, kd - t.k)); return tr[tr.length - 1]; }, vz = t.error ? t.executed.v[1] - t.error.sigL * t.error.eL * Math.min(1, t.speedPlayer / 6) : 0;
    const pPlan = sim([t.desired.v[0], Math.max(0, vz), t.desired.v[2]]), pExec = sim(t.executed.v), act = S.rec[kd] ? S.rec[kd].ball : null;   // (the planned launch with its planned lift)
    const actP = act ? K(act.p) : null, d2 = (u, w) => u && w ? +Math.hypot(u[0] - w[0], u[2] - w[2]).toFixed(3) : null, chk = checks.get(t.id) || null;
    rows.push({ id, sd, k: t.k, F: t.F, reg: t.reg, speedPlan: +t.desired.speed.toFixed(2), speedExec: +t.executed.speed.toFixed(2), errSigma: t.error ? [t.error.eS, t.error.eD, t.error.eL].map((x) => +x.toFixed(2)) : null, floorK: t.floorK,
      target: t.desired.target, targetK: t.desired.kNext, dec: dec ? { kc: dec.kc, F: dec.F, reg: dec.reg } : null,
      atDecisive: { k: kd, plannedLaunch: pPlan.p, executedLaunch: pExec.p, actual: actP, actualV: act ? K(act.v) : null, actualH: act ? act.p[1] : null, gapPlanExec: d2(pPlan.p, pExec.p), gapExecActual: d2(pExec.p, actP), gapPlanActual: d2(pPlan.p, actP) },
      envelopeAtCommit: envAt.get(t.id) || null, check: chk ? { ok: chk.ok, inside: chk.inside, worst: chk.worst, nominal: chk.nominal, env: chk.env.map((e) => ({ tag: e.tag, margin: e.margin })) } : null,
      next: nx ? { k: nx.k, F: nx.F, reg: nx.reg, role: nx.role, decisiveHit: !!(dec && nx.F === dec.F && Math.abs(nx.k - dec.kc) <= 12) } : null, taken: q ? q.taken : null });
  }
}
const n = rows.length, hit = rows.filter((r) => r.next && r.next.decisiveHit).length, tk = rows.filter((r) => r.taken).length, med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
const sum = { setups: n, decisiveExecuted: hit, takenAfter: tk, medianGapPlanExecM: med(rows.map((r) => r.atDecisive.gapPlanExec)), medianGapExecActualM: med(rows.map((r) => r.atDecisive.gapExecActual)), firmed: rows.filter((r) => r.floorK > 1).length, noNextTouch: rows.filter((r) => !r.next).length };
console.log(JSON.stringify(sum)); for (const r of rows) console.log(`${r.id}:${r.sd} k${r.k} ${r.F} ${r.reg} plan ${r.speedPlan} exec ${r.speedExec} floorK ${r.floorK} | gap plan→exec ${r.atDecisive.gapPlanExec} exec→actual ${r.atDecisive.gapExecActual} | dec ${r.dec ? r.dec.F + "@" + r.dec.kc : "-"} next ${r.next ? r.next.F + "@" + r.next.k + " " + r.next.role + (r.next.decisiveHit ? " HIT" : "") : "none"} ${r.taken ? "TAKEN" : "lost"}${r.check ? " | check in " + r.check.inside + " worst " + r.check.worst : ""}${Array.isArray(r.envelopeAtCommit) ? " | envelope " + r.envelopeAtCommit.filter((e) => e.exists).length + "/" + r.envelopeAtCommit.length + " " + r.envelopeAtCommit.filter((e) => !e.exists).map((e) => e.tag).join(",") : ""}`);
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ summary: sum, rows }, null, 1));
