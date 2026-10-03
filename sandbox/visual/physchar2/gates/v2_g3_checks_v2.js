// ═══ physchar2/gates/v2_g3_checks_v2.js — evaluation of g3/G3_CRITERIA_v2.md (APPROVED POST-INVESTIGATION REVISION of v1; pure functions) ═════
// v2 replaces v1 rows E / F / I (support state defined from the departing foot), J (measured mirror floor + controller symmetry), P (earlier gates
// re-validated after the approved plant change) and S (isolated benchmark, scope = controller + actuator computation). Every other row is
// evaluated exactly as in v1 (imported). v1 stays the historical criteria; both evaluations are reported.
import { evaluate as evaluateV1, cls } from "./v2_g3_checks.js";
const mx = (a) => Math.max(...a), num = (x, n = 2) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n));
const ok = (r) => ["stood", "recovered"].includes(r.outcome), slipMax = (r) => mx(r.g3.feet.map(f => f.slipMm)), endOk = (r) => r.g3.endLoad && Math.abs(r.g3.endLoad[1] - 0.5) <= 0.03;
export const NSS_BW = 0.05, SWING_BW = 0.02;
// near-single-support (settled window): unloaded foot ≤ 5 % BW, still touching, COM and CoP in the stance foot, ξ margin ≥ 1 cm
function nss(h) { const q = h.settled; return q && q.otherMaxBW <= NSS_BW && q.otherTouchMin >= 1 && q.comInStance && q.copInStance && q.xiMarginMinCm >= 1; }
const nssV = (id, h) => { const q = h.settled; return `${id}: unloaded foot ≤ ${num(q.otherMaxBW * 100, 2)} % BW (settled), ≥ ${q.otherTouchMin} pieces, COM in ${q.comInStance}, CoP in ${q.copInStance}, ξ margin ${num(q.xiMarginMinCm, 1)} cm; stance foot settled min ${num(q.loadMin * 100, 2)} % / mean ${num(q.loadMean * 100, 2)} % (v1 window min ${num(h.loadMin * 100, 2)} %)`; };
// swing-ready (full unloading): unloaded foot ≤ 2 % BW over the U hold window, no material drag / relocation, stance controlled
function swing(r, st) { const o = st === "R" ? 0 : 1, h = r.g3.holds[st], ft = r.g3.feet[o];
  return { pass: ok(r) && h.otherMaxBW <= SWING_BW && ft.slipMm <= 2 && ft.liftMm <= 5 && ft.tiltDeg <= 3 && h.comInStance && h.xiMarginMinCm >= 1 && r.g3.pelvisRollMaxDeg <= 5 && r.g3.trunkLeanMaxDeg <= 5 && endOk(r),
    v: `${r.outcome}; unloaded foot ≤ ${num(h.otherMaxBW * 100, 2)} % BW (contact lost ${num(r.g3.contactLossS[o], 2)} s), slip ${num(ft.slipMm, 2)} mm, lift ${num(ft.liftMm, 2)} mm, tilt ${num(ft.tiltDeg, 2)}°; stance ${num(h.loadMin * 100, 2)}–${num(h.loadMean * 100, 2)} %; COM in ${h.comInStance}, ξ margin ${num(h.xiMarginMinCm, 1)} cm; roll ${num(r.g3.pelvisRollMaxDeg, 1)}°, lean ${num(r.g3.trunkLeanMaxDeg, 1)}°` }; }
export function evaluateV2(R, ext = {}) {
  const v1 = evaluateV1(R, ext), keep = (id) => v1.checks.find(c => c.id === id), checks = [], add = (id, name, pass, value, limit, extra = {}) => checks.push({ id, name, pass: !!pass, value, limit, ...extra });
  const J = R.jobs.filter(j => !j.error), key = (k, h = "V2-REF") => J.find(j => j.key === k && j.human === h && !["determinism", "snapshot"].includes(j.group) && !j.stand && !j.stance && !j.sup && !j.xstand);
  for (const id of ["run", "A", "B", "C", "D"]) checks.push(keep(id));
  // E2 — near-single-support T5 / T6
  { const f = [["T5", "R"], ["T6", "L"]].map(([k, st]) => { const r = key(k).res, h = r.g3.holds[st]; return { pass: ok(r) && nss(h) && slipMax(r) <= 1 && r.g3.pelvisRollMaxDeg <= 5 && r.g3.trunkLeanMaxDeg <= 5 && endOk(r), v: `${k} ${r.outcome}; ${nssV(st, h)}; slip ${num(slipMax(r), 2)} mm; end ${num(r.g3.endLoad[1], 3)}` }; });
    add("E2", "near-single-support (T5 / T6): settled unloaded-foot load ≤ 5 % BW, foot still touching, stance controlled", f.every(x => x.pass), f.map(x => x.v).join(" · "), "≤ 5 % BW; ≥ 1 piece; COM & CoP in stance foot; ξ ≥ 1 cm; slip ≤ 1 mm; roll, lean ≤ 5°; end 0.5 ± 0.03"); }
  // F2 — swing-ready U:R / U:L (V2-REF)
  { const f = ["R", "L"].map(st => ({ st, ...swing(key(`U:${st}`).res, st) })); add("F2", "swing-ready / full unloading (U:R / U:L): unloaded-foot load ≤ 2 % BW, no material drag, stance controlled", f.every(x => x.pass), f.map(x => `U:${x.st} ${x.v}`).join(" · "), "≤ 2 % BW; unloaded foot slip ≤ 2 mm, lift ≤ 5 mm, tilt ≤ 3°; COM in stance; ξ ≥ 1 cm; roll, lean ≤ 5°; end 0.5 ± 0.03"); }
  for (const id of ["G", "H"]) checks.push(keep(id));
  // I2 — every body: near-single-support (T9, both holds) + swing-ready (U, both sides)
  { const bodies = [...new Set(J.filter(j => j.group === "T9").map(j => j.human))], rows = bodies.map(hm => { const r = J.find(j => j.group === "T9" && j.human === hm).res, hs = ["R", "L"].map(id => r.g3.holds[id]);
      const u = ["R", "L"].map(st => { const j = J.find(x => x.group === "T9U" && x.human === hm && x.key === `U:${st}`); return j ? swing(j.res, st) : { pass: false, v: "missing" }; });
      const pass = ok(r) && hs.every(nss) && slipMax(r) <= 1 && endOk(r) && u.every(x => x.pass);
      return { human: hm, pass, v: `${hm}: T9 ${r.outcome}, ${nssV("R", hs[0])}; ${nssV("L", hs[1])}; U:R ${u[0].pass ? "✓" : "✗"} (${u[0].v.split(";")[1]}), U:L ${u[1].pass ? "✓" : "✗"} (${u[1].v.split(";")[1]})` }; });
    add("I2", "every body variant: near-single-support (T9, both holds) and swing-ready (U, both sides)", rows.length === 8 && rows.every(x => x.pass), `${rows.filter(x => x.pass).length}/${rows.length} · ` + rows.map(x => x.v).join(" · "), "8/8", { rows }); }
  // J2 — mirror symmetry from the tick-by-tick mirrored-pair tool
  { const mp = ext.mirrorPairs; if (!mp) add("J2", "mirror symmetry (tick-by-tick mirrored pairs)", false, "not run", "all pairs");
    else { const P = mp.pairs.filter(p => !p.error), bad = [], NS = P.filter(p => !p.sliding), SL = P.filter(p => p.sliding);
      for (const p of P) { const why = [];
        if (!p.sliding && p.posDiffMaxMm > 0.1) why.push(`non-sliding Δpos ${num(p.posDiffMaxMm, 3)} mm`); if (p.sliding && (!p.sameClass || p.posDiffMaxMm > 2.0)) why.push(`sliding Δpos ${num(p.posDiffMaxMm, 3)} mm, class ${p.clsA} / ${p.clsB}`);
        if (!p.sameAbort) why.push(`abort ${p.abortA} / ${p.abortB}`); if (p.lamDiffMax > 1e-9) why.push(`Δλ ${p.lamDiffMax}`); if (p.cmdCopDiffPreSlideMm > 0.1) why.push(`commanded CoP pre-slide Δ ${num(p.cmdCopDiffPreSlideMm, 3)} mm`); if (!p.lengthsEqual) why.push("run lengths differ");
        if (why.length) bad.push(`${p.a}/${p.b}${p.human !== "V2-REF" ? " " + p.human : ""}: ${why.join(", ")}`); }
      const t9 = J.filter(j => j.group === "T9").map(j => ({ h: j.human, d: Math.abs(j.res.g3.holds.R.loadMean - j.res.g3.holds.L.loadMean) })), t9bad = t9.filter(x => x.d > 1e-3);
      add("J2", "mirror symmetry: non-sliding Δpos ≤ 0.1 mm; sliding same class and Δpos ≤ 2.0 mm; controller decisions / commands mirror-identical", P.length === mp.pairs.length && !bad.length && !t9bad.length,
        `${P.length - bad.length}/${P.length} pairs; non-sliding ${NS.length}: max Δpos ${num(NS.length ? mx(NS.map(p => p.posDiffMaxMm)) : 0, 4)} mm; sliding ${SL.length}: max Δpos ${num(SL.length ? mx(SL.map(p => p.posDiffMaxMm)) : 0, 3)} mm, classes ${SL.filter(p => p.sameClass).length}/${SL.length} identical; commanded CoP before sliding max Δ ${num(mx(P.map(p => p.cmdCopDiffPreSlideMm)), 5)} mm; Δλ max ${mx(P.map(p => p.lamDiffMax)).toExponential(1)}; abort decisions ${P.filter(p => p.sameAbort).length}/${P.length} identical; T9 R/L hold-mean Δ max ${num(mx(t9.map(x => x.d)), 5)}${bad.length ? " · FAIL: " + bad.slice(0, 8).join("; ") : ""}`,
        "Δpos ≤ 0.1 mm (non-sliding) / ≤ 2.0 mm + same class (sliding); identical aborts; Δλ ≤ 1e-9; commanded CoP Δ ≤ 0.1 mm before sliding; T9 Δ mean ≤ 1e-3", { pairs: P }); } }
  for (const id of ["K", "L", "M", "N", "O"]) checks.push(keep(id));
  // P2 — earlier gates re-validated after the approved ankle plant change
  { const g = ext.earlier; add("P2", "earlier gates valid after the approved plant change: G0 pass; G1 criteria PASS; G1 browser = Node; G2 criteria 13/13; G2 browser = Node", g && g.g0 && g.g1Pass && g.g1Browser && g.g2Pass && g.g2Browser,
    g ? `G0 ${g.g0 ? "pass" : "FAIL"}; G1 ${g.g1Pass ? "PASS" : "FAIL"} (${g.g1Detail || ""}); G1 browser ${g.g1Browser ? "= Node" : "≠ Node"}; G2 ${g.g2Detail}; G2 browser ${g.g2Browser ? "= Node" : "≠ Node"}` : "not run", "all"); }
  checks.push(keep("Q"));
  // S2 — isolated benchmark, scope B (controller + actuator computation), averaged per tick, budget 0.15 ms unchanged
  { const b = ext.bench, sc = b && b.scenarios["G3 T5"]; if (!sc) add("S2", "controller + actuator computation ≤ 0.15 ms per tick averaged (isolated benchmark, G3 T5)", false, "not run", "≤ 0.15 ms");
    else { const m = (o, k) => o[k].medianOfMeans, mean = m(sc.ctrlPlusActuators, "steadyMean"), ctl = m(sc.ctrlOnly, "steadyMean"), ins = b.instrumentation || {};
      add("S2", "controller + actuator computation ≤ 0.15 ms per tick averaged (isolated benchmark, G3 T5; scope B per spec §20)", mean <= 0.15,
        `controller + actuators: mean ${num(mean, 4)} ms (trial range ${num(sc.ctrlPlusActuators.steadyMean.min, 4)}–${num(sc.ctrlPlusActuators.steadyMean.max, 4)}), median ${num(m(sc.ctrlPlusActuators, "steadyMedian"), 4)}, p99 ${num(m(sc.ctrlPlusActuators, "steadyP99"), 4)} · controller only: mean ${num(ctl, 4)}, median ${num(m(sc.ctrlOnly, "steadyMedian"), 4)}, p99 ${num(m(sc.ctrlOnly, "steadyP99"), 4)} · actuator computation ≈ ${num(mean - ctl, 4)} ms · optional IK-timer instrumentation ${ins.ikTimerMs != null ? num(ins.ikTimerMs, 5) + " ms/tick" : "—"}; now() ${num(b.nowCallMs * 1e6, 1)} ns/call; ${b.trials} trials, warm-up discarded, load ${b.loadavg.map(x => x.toFixed(1)).join("/")}`, "≤ 0.15 ms (mean); median / p99 reported"); } }
  return { criteria: "g3/G3_CRITERIA_v2.md (approved post-investigation revision)", allPass: checks.every(c => c.pass), passed: checks.filter(c => c.pass).length, total: checks.length, checks, v1: { passed: v1.passed, total: v1.total, failing: v1.checks.filter(c => !c.pass).map(c => c.id) } };
}
export { cls };
