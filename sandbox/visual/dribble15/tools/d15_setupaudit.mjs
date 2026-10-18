// dribble15/tools/d15_setupaudit.mjs — SET-UP VALIDATOR AUDIT (the owner's DRIBBLE-1.4 §7–10): every set-up touch a core makes with the set-up check
// OFF (so each one is executed and its real outcome is known), graded at its commit against the execution envelope the validator uses:
//   per envelope variant (nominal, speed ±1.5σ × direction ±1.5σ, lift ±1.5σ): the exact BALL-PHYS trajectory, then decisiveQuality — the slots of the
//   decisive window where the decisive foot can meet that ball (space × time corridor), the best contact's planner cost, tick offset, ball speed
//   and height; plus the validator's own yes / no (decisiveExists) — so the DRIBBLE-1.3 rule (≥ 5 of 6) can be scored against outcomes;
//   OUTCOME (from the unperturbed run): the planned decisive executed (same foot within ±12 ticks), the cut taken / taken cleanly, control lost
//   within 1 s of the set-up, the decisive touch's surface and speed.
// The analysis runs in a replay of the same run stopped at the set-up's commit (the audit's own pose / prediction work never touches the run whose
// outcome is recorded). usage: node d15_setupaudit.mjs "SCN1,SCN2" a b [ver d15] [out.json] [opts-json]     (D1OVR passes through)
import fs from "fs"; import { makeSim, PROFILES } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d15_quality.mjs";
const [idsA = "CUT60_RUN,CUT60L_RUN,CUT90_RUN,CUT90L_RUN", a = "1", b = "8", ver = "d15", outFile, optsA] = process.argv.slice(2), K = (x) => [x[0], x[1], -x[2]], rows = [];
const opts = Object.assign({ record: true, plan13: true }, optsA ? JSON.parse(optsA) : {});
const sim = (id, sd) => makeSim(get(id), { ver, seed: sd, player: PROFILES.HIGH, opts });
for (const id of idsA.split(",")) for (let sd = +a; sd <= +b; sd++) {
  const scn = get(id), S = sim(id, sd), commits = [], cm = S.commit.bind(S);
  S.commit = function (k, P) { if (P && P.setupSw && P.dec) commits.push({ k, id: P.id, F: P.F, reg: P.reg, dec: { kc: P.dec.kc, F: P.dec.F, reg: P.dec.reg, dir: P.dec.dir } }); return cm(k, P); };
  S.run(); const q = cutQuality(S, scn), T = S.touches.filter((t) => t.launched);
  for (const cmt of commits) {
    const t = T.find((x) => x.k === cmt.k) || null; if (!t) continue; const i = T.indexOf(t), nx = T[i + 1] || null;
    const decHit = !!(nx && nx.F === cmt.dec.F && Math.abs(nx.k - cmt.dec.kc) <= 12);
    const lostWithin1s = S.ctrl.changes.some((c) => c.to === "LOOSE" && c.k > cmt.k && c.k - cmt.k <= 240);
    // the replay, stopped at this commit: the envelope and its graded decisive quality
    const R = sim(id, sd), cr = R.commit.bind(R); let A = null;
    R.commit = function (k, P) {
      if (k === cmt.k && P && P.setupSw && P.dec && !A) {
        const s = Math.hypot(this.A.V[0], this.A.V[1]), c = { F: P.F, reg: P.reg, release: P.release, setupSw: true }, sg = this.touchSigma(c, s), v0 = this.launchVec(P.launch, P.geom);
        const env = this.exec13.envelope(v0, sg), pr = P.pred, smD = pr.at(P.dec.kc - pr.k0 - 1), sw = smD && !smD.legs[P.dec.F].stance ? smD.legs[P.dec.F].swing : null;
        const uDec = [Math.cos(P.dec.dir), 0, -Math.sin(P.dec.dir)], nT = Math.round(1.3 * 240);
        A = { sigma: sg, speedPlan: P.launch.speed, variants: env.map((e) => { const tr = this.simLaunch(P.ballP, e.v, nT); if (sw == null) return { tag: e.tag, exists: false, q: null };
          const qq = this.decisiveQuality(pr, P.dec.F, sw, P.dec.kc, uDec, tr, k, s); return { tag: e.tag, exists: this.decisiveExists(pr, P.dec.F, sw, P.dec.kc, uDec, tr, k, s), slots: qq.slots, tried: qq.tried, best: qq.best }; }) };
        throw { audit: true }; }
      return cr(k, P); };
    try { R.run(); } catch (e) { if (!e || !e.audit) throw e; }
    rows.push({ id, sd, k: cmt.k, F: cmt.F, reg: cmt.reg, dec: cmt.dec, speedExec: t.executed.speed, err: t.error ? [t.error.eS, t.error.eD, t.error.eL] : null, audit: A,
      outcome: { decHit, next: nx ? { k: nx.k, F: nx.F, reg: nx.reg, role: nx.role, speed: +nx.executed.speed.toFixed(2) } : null, taken: q ? q.taken : null, clean: q ? q.takenCleanly : null, lostWithin1s } });
    const v = A ? A.variants.filter((x) => x.tag !== "nominal") : [];
    console.log(`${id}:${sd} k${cmt.k} ${cmt.F} ${cmt.reg} → dec ${cmt.dec.F}@${cmt.dec.kc} | exists ${v.filter((x) => x.exists).length}/6 slots ${v.map((x) => x.slots).join(",")} cost ${v.map((x) => x.best ? x.best.cost.toFixed(2) : "-").join(",")} | ${decHit ? "HIT" : "miss"} ${q && q.taken ? (q.takenCleanly ? "CLEAN" : "TAKEN") : "lost"}${lostWithin1s ? " loose<1s" : ""}`);
  }
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ ver, opts, rows }, null, 1));
