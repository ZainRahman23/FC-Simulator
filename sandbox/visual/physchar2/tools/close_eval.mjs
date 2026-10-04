// ═══ physchar2/tools/close_eval.mjs — close-decisions stage: the SUPERSEDING criteria K′ (G3) and C1′ (twist-policy battery), evaluated next to
// the ORIGINAL ones (QUALIFICATION_V2_PREREG.md). Originals are recomputed exactly as frozen; the superseding versions differ only as documented.
//   K′  every T11 request whose quasi-static target lies OUTSIDE the stance foot's usable region (signed margin < 0, tools/k_premise.mjs at the T11
//       start state, the controller's own target law) is not realised as a stable stance (fell / step required → fell / foot relocated / not
//       settled); requests whose target lies inside are FEASIBLE and reported, not required to fail. (v1 listed λ 1.2 as excessive; its target is
//       1.09–1.11 cm INSIDE the region on all 8 bodies.)
//   C1′ as C1 (PY4, PR8, HO3 decay QUIET / DECAYING), except that an HO3 run in which the body FELL is exempt when the same body's "current" policy
//       also fell (a push-capacity event: the preregistered C7 exemption, applied to C1, whose twist classification is undefined for a fallen body).
//   C7′ as C7 (HO1–HO3 outcome ok, or exempt where "current" also fails), with "ok" judged on the SUPPORTING feet: no fall / step required, and no
//       supporting foot displaced > 20 mm. A non-supporting (unloaded, touching) foot's displacement is reported, not a support failure. Supporting
//       feet at the disturbance onset: HO1 (U:R full unloading of the left foot) → right; HO2 (T5, left share 3 %) → right; HO3 (T0 bilateral) → both.
//       (v1 used G2's bilateral relocation rule — either foot > 20 mm — inside single-support scenarios, where the left foot carries no load.)
// usage: node tools/close_eval.mjs --g3=<g3_results.json> --margins=<k_premise.json> | --policy=<battery dir>
import fs from "fs";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const G3F = arg("g3", ""), MF = arg("margins", ""), PD = arg("policy", ""), out = {};
const notStable = (o) => /fell|relocated|not settled/.test(o || "");
if (G3F) { const g = JSON.parse(fs.readFileSync(G3F)), M = JSON.parse(fs.readFileSync(MF)), marg = Object.fromEntries(M.filter(r => r.human).map(r => [r.human, r.marginCm]));
  const t11 = g.jobs.filter(j => /^T11:over/.test(j.key) && j.res && j.group !== "determinism"), rows = t11.map(j => { const lam = +j.key.split(":")[2], h = j.human || j.res.human || "V2-REF", m = marg[h] ? marg[h][String(lam)] ?? marg[h][lam] : null;
    return { key: j.key, human: h, lam, marginCm: m, excessive: m != null && m < 0, outcome: j.res.outcome }; });
  const v1 = rows.every(r => notStable(r.outcome)), v2 = rows.filter(r => r.excessive).every(r => notStable(r.outcome)) && rows.some(r => r.excessive);
  out.K = { rows, v1, v2 }; console.log(`K (v1, frozen): ${v1 ? "PASS" : "FAIL"} | K′ (superseding): ${v2 ? "PASS" : "FAIL"}`); for (const r of rows) console.log(`   ${r.key} ${r.human}: target margin ${r.marginCm} cm → ${r.excessive ? "EXCESSIVE" : "feasible"}; outcome ${r.outcome}`); }
if (PD) { const R = {}; for (const f of fs.readdirSync(PD).filter(f => /^r_.*\.json$/.test(f))) { const j = JSON.parse(fs.readFileSync(PD + "/" + f)); ((R[String(j.k)] ||= {})[j.policy] ||= {})[j.human] ||= {}; R[String(j.k)][j.policy][j.human][j.scen] = j; }
  const ok = (o) => o === "stood" || o === "recovered", dec = (x) => x && ["QUIET", "DECAYING"].includes(x.decay.cls);
  for (const k of Object.keys(R).sort()) for (const p of Object.keys(R[k]).sort()) { const per = {};
    for (const [b, S] of Object.entries(R[k][p])) { const base = (R[k].current || {})[b] || {}, c1 = ["PY4", "PR8", "HO3"].every(s => dec(S[s]));
      const c1p = ["PY4", "PR8"].every(s => dec(S[s])) && (dec(S.HO3) || (S.HO3 && !ok(S.HO3.outcome) && base.HO3 && !ok(base.HO3.outcome)));
      const SUP = { HO1: [1], HO2: [1], HO3: [0, 1] }, okp = (x, sc) => x && !/fell/.test(x.outcome) && SUP[sc].every(n => x.slipMm[n] <= 20);
      const c7 = ["HO1", "HO2", "HO3"].every(sc => S[sc] && (ok(S[sc].outcome) || (base[sc] && !ok(base[sc].outcome)))), c7p = ["HO1", "HO2", "HO3"].every(sc => S[sc] && (okp(S[sc], sc) || (base[sc] && !okp(base[sc], sc))));
      per[b] = { C1: c1, C1p: c1p, C7: c7, C7p: c7p, HO3: S.HO3 && S.HO3.outcome, HO3cur: base.HO3 && base.HO3.outcome, HO1slip: S.HO1 && S.HO1.slipMm }; }
    (out.C1 ||= {})[`${k}/${p}`] = per; const f1 = Object.entries(per).filter(([, v]) => !v.C1).map(([b]) => b), f1p = Object.entries(per).filter(([, v]) => !v.C1p).map(([b]) => b);
    const f7 = Object.entries(per).filter(([, v]) => !v.C7).map(([b]) => b), f7p = Object.entries(per).filter(([, v]) => !v.C7p).map(([b]) => b);
    console.log(`k ${k} ${p}: C1 (v1) fails on ${f1.length ? f1.join(", ") : "none"} | C1′ fails on ${f1p.length ? f1p.join(", ") : "none"} | C7 (v1) fails on ${f7.length ? f7.join(", ") : "none"} | C7′ fails on ${f7p.length ? f7p.join(", ") : "none"}`); } }
const o = arg("out", ""); if (o) fs.writeFileSync(o, JSON.stringify(out, null, 1));
