// ═══ physchar2/gates/v2_g3_checks.js — evaluation of the PRE-REGISTERED g3/G3_CRITERIA.md v1 on the final run's results (pure functions) ═══════
// Input: the job list of tools/g3_run.js (g3/json/g3_results.json) + the separately measured browser = Node and G0 / G1 / G2 regression results.
const mx = (a) => Math.max(...a), num = (x, n = 2) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n));
const OK = ["stood", "recovered"], ok = (r) => OK.includes(r.outcome), slipMax = (r) => mx(r.g3.feet.map(f => f.slipMm)), endOk = (r) => r.g3.endLoad && Math.abs(r.g3.endLoad[1] - 0.5) <= 0.03;
export const stanceIdx = (s) => (s === "R" ? 1 : 0);
// T8 outcome class (mirror comparison and boundaries): recovered (continued) / recovered after abort / relocated / not settled / fell (step required)
export function cls(r) { if (!r) return "?"; const ab = r.g3.abortT != null; if (ok(r)) return ab ? "recovered (aborted)" : "recovered"; return r.outcome + (ab ? " (aborted)" : ""); }
export function evaluate(R, ext = {}) {
  const J = R.jobs.filter(j => !j.error), by = (g) => J.filter(j => j.group === g), key = (k) => J.find(j => j.key === k && j.group !== "determinism" && j.group !== "snapshot" && !j.stand && !j.stance && !j.sup), checks = [], add = (id, name, pass, value, limit, extra = {}) => checks.push({ id, name, pass: !!pass, value, limit, ...extra });
  const errors = R.jobs.filter(j => j.error); add("run", "every job completed without error", errors.length === 0, `${J.length} ok / ${errors.length} errors`, "0 errors");
  const H = (r, id) => r.g3.holds[id];
  // A — T0
  { const r = key("T0").res, h = H(r, "B"); add("A", "T0 bilateral baseline (λ_R 0.5, 20 s)", ok(r) && h.loadMean >= 0.47 && h.loadMean <= 0.53 && slipMax(r) <= 1 && mx(r.g3.contactLossS) === 0,
    `${r.outcome}; hold mean load_R ${num(h.loadMean, 3)}; slip ${num(slipMax(r), 2)} mm; contact loss ${num(mx(r.g3.contactLossS), 2)} s`, "stood; 0.47–0.53; ≤ 1 mm; 0 s"); }
  // B / C — strong transfers
  const strong = (r, ids) => { const hs = ids.map(id => H(r, id)); return { pass: ok(r) && hs.every(h => h.loadMean >= 0.83 && h.loadMin >= 0.80) && r.g3.trackRms <= 0.05 && endOk(r) && slipMax(r) <= 1 && mx(r.g3.contactLossS) === 0 && r.g3.pelvisRollMaxDeg <= 5 && r.g3.trunkLeanMaxDeg <= 5,
    v: `${r.outcome}; holds ${hs.map((h, i) => `${ids[i]} ${num(h.loadMin, 3)}/${num(h.loadMean, 3)}`).join(", ")}; RMS ${num(r.g3.trackRms, 3)}; end ${num(r.g3.endLoad[1], 3)}; slip ${num(slipMax(r), 2)} mm; roll ${num(r.g3.pelvisRollMaxDeg, 1)}°; lean ${num(r.g3.trunkLeanMaxDeg, 1)}°` }; };
  { const a = strong(key("T1").res, ["R"]), b = strong(key("T2").res, ["L"]); add("B", "T1 / T2 strong transfer 50 → 85 % → 50, R and L", a.pass && b.pass, `T1: ${a.v} · T2: ${b.v}`, "hold min ≥ 0.80, mean ≥ 0.83; RMS ≤ 0.05; end 0.5 ± 0.03; slip ≤ 1 mm; no contact loss; roll, lean ≤ 5°"); }
  { const c = strong(key("T3").res, ["R", "L"]); add("C", "T3 cycle R 85 % → 50 → L 85 % → 50", c.pass, c.v, "row B, both holds"); }
  // D — T4 drift
  { const r = key("T4").res, m = r.g3.marks, m1 = m[1], m5 = m[m.length - 1], hm = (id) => H(r, id).loadMean, dD = Math.abs(m5.pelvisDriftMm - m1.pelvisDriftMm), dY = Math.abs(m5.yaw - m1.yaw), dR = Math.abs(hm("R5") - hm("R1")), dL = Math.abs(hm("L5") - hm("L1"));
    add("D", "T4 five repeated cycles — drift bounded", ok(r) && dD <= 5 && dY <= 1 && slipMax(r) <= 2 && dR <= 0.01 && dL <= 0.01 && endOk(r),
      `${r.outcome}; pelvis drift cycle 1 → 5: ${num(m1.pelvisDriftMm, 1)} → ${num(m5.pelvisDriftMm, 1)} mm (Δ ${num(dD, 2)}); yaw ${num(m1.yaw, 2)} → ${num(m5.yaw, 2)}° (Δ ${num(dY, 2)}); slip ${num(slipMax(r), 2)} mm; hold means R ${num(hm("R1"), 3)} → ${num(hm("R5"), 3)}, L ${num(hm("L1"), 3)} → ${num(hm("L5"), 3)}; end ${num(r.g3.endLoad[1], 3)}`,
      "Δ drift ≤ 5 mm; Δ yaw ≤ 1°; slip ≤ 2 mm; Δ hold mean ≤ 0.01; end 0.5 ± 0.03", { marks: m }); }
  // E — near-single-support
  const nss = (r, st) => { const h = H(r, st); return { pass: ok(r) && h.loadMin >= 0.95 && h.otherTouchMin >= 1 && h.comInStance && h.copInStance && h.xiMarginMinCm >= 1 && slipMax(r) <= 1 && r.g3.pelvisRollMaxDeg <= 5 && r.g3.trunkLeanMaxDeg <= 5 && endOk(r),
    v: `${r.outcome}; stance load min ${num(h.loadMin, 3)} mean ${num(h.loadMean, 3)}; other foot ≤ ${num(h.otherMaxBW * 100, 1)} % BW, ≥ ${h.otherTouchMin} pieces; COM in ${h.comInStance}, CoP in ${h.copInStance}; ξ margin ${num(h.xiMarginMinCm, 1)} cm; slip ${num(slipMax(r), 2)} mm; roll ${num(r.g3.pelvisRollMaxDeg, 1)}°; lean ${num(r.g3.trunkLeanMaxDeg, 1)}°; end ${num(r.g3.endLoad[1], 3)}` }; };
  { const a = nss(key("T5").res, "R"), b = nss(key("T6").res, "L"); add("E", "T5 / T6 near-single-support hold 10 s, R and L", a.pass && b.pass, `T5: ${a.v} · T6: ${b.v}`, "load min ≥ 0.95; other foot touching; COM & CoP in stance foot; ξ margin ≥ 1 cm; slip ≤ 1 mm; roll, lean ≤ 5°; end 0.5 ± 0.03"); }
  // F — unloading
  { const f = ["R", "L"].map(st => { const r = key(`U:${st}`).res, o = 1 - stanceIdx(st), h = H(r, st), ft = r.g3.feet[o];
      return { st, pass: ok(r) && r.g3.unloadedS[o] >= 3 && ft.slipMm <= 2 && ft.liftMm <= 5 && ft.tiltDeg <= 3 && h.comInStance && endOk(r),
        v: `U:${st} ${r.outcome}; opposite foot unloaded ${num(r.g3.unloadedS[o], 2)} s (contact lost ${num(r.g3.contactLossS[o], 2)} s), slip ${num(ft.slipMm, 2)} mm, lift ${num(ft.liftMm, 2)} mm, tilt ${num(ft.tiltDeg, 2)}°; stance load min ${num(h.loadMin, 4)}; COM in ${h.comInStance}; end ${num(r.g3.endLoad[1], 3)}` }; });
    add("F", "U unloading the opposite foot (≤ 1 % BW), R and L", f.every(x => x.pass), f.map(x => x.v).join(" · "), "unloaded ≥ 3 s; unloaded foot slip ≤ 2 mm, lift ≤ 5 mm, tilt ≤ 3°; COM in stance foot; end 0.5 ± 0.03"); }
  // G — speed
  { const rows = by("T7"), need = rows.filter(j => ["4", "2"].includes(j.key.split(":")[2])), g = need.map(j => { const r = j.res, st = j.key.split(":")[1], h = H(r, st); return { k: j.key, pass: ok(r) && slipMax(r) <= 1 && r.g3.abortT == null && h.loadMean >= 0.93, v: `${j.key} ${r.outcome} hold mean ${num(h.loadMean, 3)} slip ${num(slipMax(r), 2)} abort ${r.g3.abortT == null ? "—" : num(r.g3.abortT, 2)}` }; });
    add("G", "T7 speed: 4 s and 2 s ramps clean, both sides (faster ramps: the reported envelope)", g.length === 4 && g.every(x => x.pass), g.map(x => x.v).join(" · "), "stood; slip ≤ 1 mm; no abort; hold mean ≥ 0.93",
      { envelope: rows.map(j => ({ key: j.key, outcome: j.res.outcome, cls: cls(j.res), holdMean: H(j.res, j.key.split(":")[1]).loadMean, slip: slipMax(j.res), abortT: j.res.g3.abortT, trackRms: j.res.g3.trackRms })) }); }
  // H — perturbation during transfer
  { const T8 = by("T8"), p = (j) => { const [, when, st, dir, m] = j.key.split(":"); return { when, st, dir, m: +m }; }, inward = { R: ["L", "FL", "BL"], L: ["R", "FR", "BR"] };
    const okP = (r) => ok(r) && slipMax(r) <= 20, h1 = T8.filter(j => p(j).m === 5), h2 = T8.filter(j => p(j).when === "hold" && inward[p(j).st].includes(p(j).dir) && p(j).m <= 15);
    const h3 = by("T7").filter(j => ["4", "2", "1"].includes(j.key.split(":")[2])), f1 = h1.filter(j => !okP(j.res)), f2 = h2.filter(j => !okP(j.res)), f3 = h3.filter(j => j.res.g3.abortT != null);
    add("H", "T8 perturbation during transfer: H1 all 5 N·s; H2 inward ≤ 15 N·s at the hold; H3 no false aborts", h1.length === 32 && h2.length === 18 && !f1.length && !f2.length && !f3.length,
      `H1 ${h1.length - f1.length}/${h1.length}${f1.length ? " (fail: " + f1.map(j => j.key + " " + j.res.outcome).join(", ") + ")" : ""}; H2 ${h2.length - f2.length}/${h2.length}${f2.length ? " (fail: " + f2.map(j => j.key + " " + j.res.outcome).join(", ") + ")" : ""}; H3 aborts in nominal T7 ≥ 1 s: ${f3.length}`,
      "32/32; 18/18; 0", { grid: T8.map(j => ({ ...p(j), outcome: j.res.outcome, cls: cls(j.res), slip: slipMax(j.res), abortT: j.res.g3.abortT, bilateralOk: j.res.g3.abortBilateralOk, lean: j.res.g3.trunkLeanMaxDeg, yaw: j.res.g3.yawMaxDeg })) }); }
  // I — bodies
  { const rows = by("T9"), f = rows.map(j => { const r = j.res, hs = ["R", "L"].map(id => H(r, id)); return { human: j.human, pass: ok(r) && hs.every(h => h.loadMin >= 0.95 && h.otherTouchMin >= 1 && h.comInStance) && slipMax(r) <= 1 && endOk(r), v: `${j.human} ${r.outcome} R ${num(hs[0].loadMin, 3)} L ${num(hs[1].loadMin, 3)} slip ${num(slipMax(r), 2)}` }; });
    add("I", "T9 body variants: near-single-support cycle, all 8 bodies", rows.length === 8 && f.every(x => x.pass), `${f.filter(x => x.pass).length}/${rows.length}: ` + f.map(x => x.v).join(" · "), "8/8"); }
  // J — mirror
  { const pairs = [], cmp = (name, ra, rb, ha, hb) => { const A = ra.g3.holds[ha], B = rb.g3.holds[hb], fall = !ok(ra) || !ok(rb), dm = A && B ? Math.abs(A.loadMean - B.loadMean) : 0, dr = Math.abs(ra.g3.trackRms - rb.g3.trackRms), ds = fall ? 0 : Math.abs(slipMax(ra) - slipMax(rb));
      pairs.push({ name, dm, dr, ds, ok: dm <= 0.005 && dr <= 0.005 && ds <= 0.5 && ra.outcome === rb.outcome }); };
    cmp("T1/T2", key("T1").res, key("T2").res, "R", "L"); cmp("T5/T6", key("T5").res, key("T6").res, "R", "L"); cmp("U:R/U:L", key("U:R").res, key("U:L").res, "R", "L");
    for (const T of [4, 2, 1, 0.75, 0.5, 0.25]) cmp(`T7 ${T} s`, key(`T7:R:${T}`).res, key(`T7:L:${T}`).res, "R", "L");
    for (const j of by("T9")) { const A = j.res.g3.holds.R, B = j.res.g3.holds.L; pairs.push({ name: `T9 ${j.human} R/L hold`, dm: Math.abs(A.loadMean - B.loadMean), dr: 0, ds: 0, ok: Math.abs(A.loadMean - B.loadMean) <= 0.005 }); }
    const T8 = by("T8"), mp = T8.filter(j => j.mirrorOf).map(j => { const a = T8.find(x => x.key === j.mirrorOf); return { k: j.mirrorOf, m: +j.key.split(":")[4], a: cls(a.res), b: cls(j.res) }; }), same = mp.filter(x => x.a === x.b), five = mp.filter(x => x.m === 5);
    add("J", "T10 mirror symmetry (no per-side gains)", pairs.every(x => x.ok) && same.length >= 0.95 * mp.length && five.every(x => x.a === x.b),
      `${pairs.filter(x => x.ok).length}/${pairs.length} scalar pairs within tolerance (max Δ load mean ${num(mx(pairs.map(x => x.dm)), 4)}, Δ RMS ${num(mx(pairs.map(x => x.dr)), 4)}, Δ slip ${num(mx(pairs.map(x => x.ds)), 2)} mm); T8 mirrored classes ${same.length}/${mp.length} identical${mp.length - same.length ? " (differ: " + mp.filter(x => x.a !== x.b).map(x => `${x.k} ${x.a} vs ${x.b}`).join("; ") + ")" : ""}`,
      "Δ mean ≤ 0.005, Δ RMS ≤ 0.005, Δ slip ≤ 0.5 mm; T8 ≥ 95 % and every 5 N·s pair", { pairs, t8: mp }); }
  // K — excessive
  { const rows = by("T11"), over = rows.filter(j => j.key.includes("over")), f = over.map(j => ({ k: j.key, pass: !ok(j.res), out: j.res.outcome }));
    add("K", "T11 excessive request (λ 1.2 / 1.4 / 1.4 supervised) is not realised — it fails physically", over.length === 3 && f.every(x => x.pass), rows.map(j => `${j.key}: ${j.res.outcome}${j.res.g3.abortT != null ? ` (abort ${num(j.res.g3.abortT, 2)} s, bilateral recovery ${j.res.g3.abortBilateralOk ? "possible" : "impossible"})` : ""}`).join(" · "), "not stood / recovered; row L"); }
  // L — authority / energy / actuators (every gate run)
  { const G = J.filter(j => ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "U", "T7", "T8", "T9", "T11"].includes(j.group)), bad = [];
    for (const j of G) { const r = j.res, Js = r.push ? r.push.J : [0, 0, 0], dJ = Math.hypot(...r.ledger.Jext.map((x, i) => x - Js[i])), sJ = Math.hypot(...Js);
      if (r.ledger.authorityWrites !== 0 || dJ > 1e-9 * Math.max(1, sJ) || Math.hypot(...r.ledger.Hext) !== 0 || r.actuators.overCapTicks !== 0 || r.ledger.closure > 0.5) bad.push(`${j.key}: writes ${r.ledger.authorityWrites} ΔJ ${dJ.toExponential(1)} overCap ${r.actuators.overCapTicks} residual ${num(r.ledger.closure, 3)} J`); }
    const cl = G.map(j => j.res.ledger.closure); add("L", "authority 0 / external impulse = scheduled / no over-capacity / energy residual ≤ +0.5 J — every gate run", !bad.length,
      `${G.length - bad.length}/${G.length} runs; energy residual max ${num(mx(cl), 3)} J, min ${num(Math.min(...cl), 3)} J${bad.length ? "; " + bad.slice(0, 6).join("; ") : ""}`, "all"); }
  // M — contact / foot
  { const G = J.filter(j => ["T1", "T2", "T3", "T4", "T5", "T6", "U", "T9"].includes(j.group)), w = G.map(j => ({ k: j.key, jump: mx(j.res.extra.copJumpMaxMm), seams: j.res.g3.seam.map(s => s.crossings) }));
    add("M", "per-foot CoP smooth across boot-piece seams (≤ 5 mm per tick)", w.every(x => x.jump <= 5), `max per-tick per-foot CoP change ${num(mx(w.map(x => x.jump)), 3)} mm over ${w.length} runs; seam crossings per run (L+R) ${Math.min(...w.map(x => x.seams[0] + x.seams[1]))}–${mx(w.map(x => x.seams[0] + x.seams[1]))}`, "≤ 5 mm", { rows: w }); }
  // N — determinism / snapshot
  { const D = by("determinism"), groups = {}; for (const j of D) (groups[j.key] = groups[j.key] || []).push(j.res.hash); const det = Object.entries(groups).map(([k, h]) => ({ k, h, same: h.length === 3 && h.every(x => x === h[0]) }));
    const S = by("snapshot"); add("N", "determinism ×3 + snapshot / restore", det.length === 4 && det.every(x => x.same) && S.length === 3 && S.every(j => j.res.same),
      det.map(x => `${x.k} ${x.same ? "×3 " + x.h[0] : "DIFFER " + x.h.join("/")}`).join("; ") + " · snapshot " + S.map(j => `${j.key}@${j.at}s ${j.res.same ? "bit-exact" : "DIFFER"}`).join(", "), "identical"); }
  // O — browser
  { const b = ext.browser; add("O", "browser = Node (T5, U:R, T3, T8 hold R push R 10)", b && b.allPass, b ? b.rows.map(r => `${r.pass ? "✓" : "✗"} ${r.key}`).join(" ") : "not run", "4/4 identical"); }
  // P — regressions
  { const g = ext.regression; add("P", "G0 8/8; G1 curated + full unchanged; G2 final run (620) unchanged", g && g.g0 && g.g1curated && g.g1full && g.g2 && g.g2.same === g.g2.n && g.g2.n === 620,
    g ? `G0 ${g.g0 ? "8/8" : "FAIL"}; G1 curated ${g.g1curated ? "10/10" : "FAIL"}; G1 full ${g.g1full ? "unchanged (" + g.g1HashesCompared + " hashes)" : "CHANGED"}; G2 ${g.g2 ? g.g2.same + "/" + g.g2.n + " hashes identical" : "not run"}` : "not run", "all"); }
  // Q — twin
  { const G = J.filter(j => ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "U"].includes(j.group)), m = mx(G.map(j => j.res.g3.twin.max)); add("Q", "force-plate twin: whole-body momentum = Σ foot contact impulses + gravity (+ test impulse)", m <= 1e-3, `residual max ${m.toExponential(2)} of M·g·dt over ${G.length} runs`, "≤ 1e-3"); }
  // S — cost
  { const r = key("T5").res; add("S", "controller cost (T5, V2-REF)", r.cpu.ctrlMs <= 0.15, `controller ${num(r.cpu.ctrlMs, 4)} ms/tick (of which leg IK ${num(r.g3.ikMs, 4)}); physics step ${num(r.cpu.stepMs, 3)}, passive ${num(r.cpu.passiveMs, 3)}, actuators ${num(r.cpu.actMs, 4)}, probes ${num(r.cpu.probeMs, 4)}, G3 measurement ${num(r.g3.cpu3Ms, 4)} ms/tick`, "≤ 0.15 ms"); }
  const gate = checks; return { allPass: gate.every(c => c.pass), passed: gate.filter(c => c.pass).length, total: gate.length, checks: gate };
}
