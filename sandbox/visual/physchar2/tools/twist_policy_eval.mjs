// ═══ physchar2/tools/twist_policy_eval.mjs — evaluates the PREREGISTERED twist-policy battery (final_pre_e1a/TWIST_POLICY_PREREG.md §3–4)
// over the r_<k>_<policy>_<body>_<scen>.json files of tools/twist_policy_battery.mjs. Criteria exactly as preregistered; prints per (k, policy)
// the pass / fail per criterion per body, the eligibility, and the reported (non-gating) metrics.
// usage: node tools/twist_policy_eval.mjs <dir> [out.json]
import fs from "fs";
const DIR = process.argv[2], OUT = process.argv[3], files = fs.readdirSync(DIR).filter(f => /^r_.*\.json$/.test(f)), R = {};
for (const f of files) { const j = JSON.parse(fs.readFileSync(DIR + "/" + f)), kk = String(j.k); ((R[kk] ||= {})[j.policy] ||= {})[j.human] ||= {}; R[kk][j.policy][j.human][j.scen] = j; }
const BODIES = ["V2-165-62", "V2-175-70", "V2-REF", "V2-190-85", "V2-198-92", "V2-long-legs", "V2-short-legs", "V1-matched"], POLS = ["current", "ref", "b50", "b35", "d1", "d2"];
const okOut = (o) => o === "stood" || o === "recovered", med = (a) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const crit = (S, base) => {   // S: scenario results for one (k, policy, body); base: the same body's "current" results (C7 exemption)
  const r = {}, g = (k) => S[k];
  r.C1 = ["PY4", "PR8", "HO3"].every(k => g(k) && ["QUIET", "DECAYING"].includes(g(k).decay.cls));
  r.C1q = g("Q") ? g("Q").ankleWindows.filter(x => x.w >= 10 && x.w < 20).every(x => x.A <= 1) : false;
  r.C2 = ["PY4", "PR8"].every(k => g(k) && g(k).hipRotWork.net12_20J <= 0.5);
  r.C3 = g("SB") ? (() => { const m8 = g("SB").marks.find(m => m.t === 8), m14 = g("SB").marks.find(m => m.t === 14); return Math.abs(m14.tw[0]) <= Math.max(1, 0.25 * Math.abs(m8.tw[0])) && Math.abs(m14.yaw) <= Math.max(1, 0.25 * Math.abs(m8.yaw)); })() : false;
  r.C4 = g("TURN") ? (() => { const m6 = g("TURN").marks.find(m => m.t === 6), m12 = g("TURN").marks.find(m => m.t === 12); return m12.yaw >= 18 && Math.abs(m12.yaw - m6.yaw) <= 1; })() : false;
  r.C5 = ["T1", "T5", "UR"].every(k => g(k) && okOut(g(k).outcome) && Math.max(...g(k).slipMm) <= 1.0);
  r.C6 = g("LIFT") ? (() => { const L = g("LIFT"); return L.outcome !== "fell" && !/fell/.test(L.outcome) && L.slipMm[1] <= 1.0 && L.lift.stanceAnkleOffPeakDeg <= 5 && (L.lift.touchdownYawErrDeg == null || L.lift.touchdownYawErrDeg <= 2); })() : null;
  r.C7 = ["HO1", "HO2", "HO3"].every(k => g(k) && (okOut(g(k).outcome) || (base && base[k] && !okOut(base[k].outcome))));
  return r; };
const out = {};
for (const kk of Object.keys(R).sort()) { console.log(`\n══ k = ${kk} N·m/° ══`); out[kk] = {};
  for (const p of POLS) { if (!R[kk][p]) continue; const per = {}, fails = {}; let elig = true, missing = 0;
    for (const b of BODIES) { const S = R[kk][p][b] || {}; if (Object.keys(S).length < 12) missing += 12 - Object.keys(S).length; const c = crit(S, (R[kk].current || {})[b]); per[b] = c;
      for (const [ck, v] of Object.entries(c)) if (v === false) { (fails[ck] ||= []).push(b); elig = false; } }
    const all = BODIES.map(b => R[kk][p][b] || {}), settle = med(all.flatMap(S => ["PY4", "PR8"].map(k => S[k] && S[k].settleS))), sbYaw = med(all.map(S => S.SB && S.SB.pelvisYawPeakDeg)), hoAnk = med(all.map(S => S.HO1 && S.HO1.peakDeg["ankle_R.fabd"]));
    const urAnk = med(all.map(S => S.UR && Math.max(S.UR.peakDeg["ankle_L.fabd"], S.UR.peakDeg["ankle_R.fabd"]))), t5Ank = med(all.map(S => S.T5 && Math.max(S.T5.peakDeg["ankle_L.fabd"], S.T5.peakDeg["ankle_R.fabd"]))), w = med(all.map(S => S.PY4 && S.PY4.hipRotWork.net12_20J));
    const liftAnk = med(all.map(S => S.LIFT && S.LIFT.lift.stanceAnkleOffPeakDeg)), turnEnd = med(all.map(S => S.TURN && S.TURN.marks.find(m => m.t === 12).yaw)), sbRes = med(all.map(S => S.SB && Math.abs(S.SB.marks.find(m => m.t === 14).tw[0])));
    out[kk][p] = { eligible: elig && !missing, missing, fails, per, settleMedS: settle, sbPelvisYawPeakMedDeg: sbYaw, sbAnkleResidualMedDeg: sbRes, ho1StanceAnklePeakMedDeg: hoAnk, urAnklePeakMedDeg: urAnk, t5AnklePeakMedDeg: t5Ank, py4HipWorkMedJ: w, liftStanceAnkleMedDeg: liftAnk, turnYaw12MedDeg: turnEnd };
    console.log(`${p.padEnd(8)} ${elig && !missing ? "ELIGIBLE" : "not eligible"}${missing ? ` (${missing} runs missing)` : ""}  fails: ${Object.entries(fails).map(([c, bs]) => `${c}[${bs.length}: ${bs.join(",")}]`).join(" ") || "none"}`);
    console.log(`         settle med ${settle} s | SB pelvis-yaw peak med ${sbYaw?.toFixed(1)}°, ankle residual med ${sbRes?.toFixed(2)}° | TURN yaw@12 med ${turnEnd?.toFixed(1)}° | UR/T5 ankle peak med ${urAnk?.toFixed(1)}/${t5Ank?.toFixed(1)}° | HO1 stance ankle med ${hoAnk?.toFixed(1)}° | LIFT stance ankle med ${liftAnk?.toFixed(1)}° | PY4 hip work med ${w?.toFixed(2)} J`); } }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out));
