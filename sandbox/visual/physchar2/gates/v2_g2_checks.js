// ═══ physchar2/gates/v2_g2_checks.js — evaluation of the PRE-REGISTERED g2/G2_CRITERIA.md v1 on the final run's results (pure functions) ═══════
// Input: the job list of tools/g2_run.js (g2/json/g2_results.json) + the separately measured browser = Node and G0 / G1 regression results.
const BIG = ["V2-REF", "V1-matched"], DIR8 = ["F", "B", "L", "R", "FL", "FR", "BL", "BR"], DIR4 = ["F", "B", "L", "R"];
const mx = (a) => Math.max(...a), num = (x, n = 2) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n));
export function inPlace(r, slipMm = 20) { return r && r.outcome === "recovered" && Math.max(...r.feet.slipMaxMm) <= slipMm; }
// boundary per (body, direction) on the 5 N·s grid: highest recovered-in-place below the first non-recovery; monotone check
export function boundary(rows) { const s = rows.slice().sort((a, b) => a.sc.J - b.sc.J); let first = null; for (const j of s) if (!inPlace(j.res)) { first = j.sc.J; break; }
  const lastOk = first == null ? s.at(-1).sc.J : (s.filter(j => j.sc.J < first).at(-1) || { sc: { J: 0 } }).sc.J;
  const inversion = first != null && s.some(j => j.sc.J > first && inPlace(j.res));
  return { recovered: lastOk, fails: first, inversion, outcomes: s.map(j => [j.sc.J, j.res.outcome, Math.max(...j.res.feet.slipMaxMm)]) }; }
export function evaluate(R, ext = {}) {
  const J = R.jobs.filter(j => !j.error), by = (g) => J.filter(j => j.group === g), checks = [], add = (id, name, pass, value, limit, extra = {}) => checks.push({ id, name, pass: !!pass, value, limit, ...extra });
  const errors = R.jobs.filter(j => j.error); add("run", "every job completed without error", errors.length === 0, `${J.length} ok / ${errors.length} errors`, "0 errors");
  // 2.1 quiet stance
  const S0 = by("S0"), f21 = [];
  for (const j of S0) { const r = j.res, e = r.extra, sl = mx(r.feet.slipMaxMm), tl = mx(r.feet.tiltMaxDeg), iso = e.peakIsoFrac[0] ? e.peakIsoFrac[0][1] : 0;
    const items = { a: !r.fell && sl <= 2 && tl <= 1, b: e.comAheadMeanCm >= 2 && e.comAheadMeanCm <= 6 && e.kneeMinDeg >= 0 && e.kneeMaxDeg <= 15, c: iso <= 0.5, d: e.satTicksAfter1s === 0,
      e: Math.hypot(...r.ledger.Jext) === 0 && Math.hypot(...r.ledger.Hext) === 0 && r.ledger.authorityWrites === 0, f: e.comRangeMm <= 10,
      g: r.g1.joints.sepRestMm <= 1 && r.g1.joints.hardExcRestDeg <= 1.5 && r.g1.contacts.turfPenRestMm <= 5 && r.g1.engine.ticks === 0 };
    f21.push({ human: j.human, items, ok: Object.values(items).every(Boolean), v: `slip ${num(sl, 2)} mm tilt ${num(tl, 2)}° COM ahead ${num(e.comAheadMeanCm, 2)} cm knee ${num(e.kneeMinDeg, 1)}–${num(e.kneeMaxDeg, 1)}° peak ${e.peakIsoFrac[0] ? e.peakIsoFrac[0][0] : "—"} ${num(iso * 100, 1)} % T_iso sat ${e.satTicksAfter1s} range ${num(e.comRangeMm, 2)} mm sep ${num(r.g1.joints.sepRestMm, 2)} mm turf ${num(r.g1.contacts.turfPenRestMm, 2)} mm eng ${r.g1.engine.ticks}` }); }
  add("2.1", "quiet stance 60 s, every body (a–g)", S0.length === 8 && f21.every(x => x.ok), `${f21.filter(x => x.ok).length}/${S0.length} bodies`, "8/8", { detail: f21 });
  // 2.2a required envelope
  const P = by("push"), req = P.filter(j => j.sc.J === 10 || (BIG.includes(j.human) && (j.sc.J === 5 || j.sc.J === 15)));
  const f22 = req.map(j => ({ human: j.human, dir: j.sc.dir, J: j.sc.J, ok: inPlace(j.res, 10) && mx(j.res.feet.tiltMaxDeg) <= 10, out: j.res.outcome, slip: mx(j.res.feet.slipMaxMm), tilt: mx(j.res.feet.tiltMaxDeg), rec: j.res.recoveryT }));
  const nReq = 8 * 8 + 2 * 2 * 8; add("2.2a", "required envelope: 10 N·s × 8 directions × every body; + 5 / 15 N·s for V2-REF and V1-matched — recovered in place (slip ≤ 10 mm, tilt ≤ 10°)", f22.length === nReq && f22.every(x => x.ok), `${f22.filter(x => x.ok).length}/${f22.length} (expected ${nReq})`, "all", { detail: f22.filter(x => !x.ok) });
  // 2.2b boundaries
  const bnd = {}; for (const j of P) { const k = j.human + "|" + j.sc.dir; (bnd[k] || (bnd[k] = [])).push(j); }
  const B = {}; for (const [k, rows] of Object.entries(bnd)) if (rows.length >= 9) B[k] = boundary(rows);
  const inv = Object.entries(B).filter(([, b]) => b.inversion), sym = [], humans = [...new Set(P.map(j => j.human))];
  for (const h of humans) for (const [a, b] of [["L", "R"], ["FL", "FR"], ["BL", "BR"]]) { const A = B[h + "|" + a], Bb = B[h + "|" + b]; if (A && Bb) sym.push({ human: h, pair: a + "/" + b, a: A.recovered, b: Bb.recovered, ok: A.recovered === Bb.recovered }); }
  add("2.2b", "boundaries measured; monotone (no recover → fail → recover inversion); symmetric L/R, FL/FR, BL/BR", inv.length === 0 && sym.every(s => s.ok), `${Object.keys(B).length} sweeps, ${inv.length} inversions, symmetry ${sym.filter(s => s.ok).length}/${sym.length}`, "0 inversions, all symmetric", { boundaries: B, symmetry: sym, inversions: inv.map(([k]) => k) });
  // 2.3 capacity integrity
  const all = J.filter(j => j.res), over = all.reduce((s, j) => s + j.res.actuators.overCapTicks, 0);
  add("2.3", "0 ticks with applied active torque above the instantaneous capacity / activation envelope (every run)", over === 0, `${over} ticks over ${all.length} runs`, "0");
  // 2.4 release
  const gate = all.filter(j => ["S0", "push", "S4", "S5"].includes(j.group)), nonrec = gate.filter(j => j.group === "push" && !inPlace(j.res));
  const ledgerOk = gate.every(j => j.res.ledger.authorityWrites === 0 && Math.hypot(...j.res.ledger.Jext.map((x, i) => x - j.res.sched.J[i])) <= 1e-9 * Math.max(1, Math.hypot(...j.res.sched.J)) + 1e-9 && Math.hypot(...j.res.ledger.Hext.map((x, i) => x - j.res.sched.H[i])) <= 1e-9 * Math.max(1, Math.hypot(...j.res.sched.H)) + 1e-9);
  const falls = gate.filter(j => j.res.fell), cpOk = falls.every(j => j.res.stepRequired), relOk = nonrec.every(j => j.res.fell || mx(j.res.feet.slipMaxMm) > 20 || j.res.outcome === "foot relocated");
  add("2.4", "release: non-recoveries fall / displace a foot physically; no hidden support (authority 0, external impulse = scheduled); every fall preceded by ξ leaving the support", ledgerOk && cpOk && relOk,
    `${nonrec.length} non-recoveries, ${falls.length} falls (${falls.filter(j => j.res.stepRequired).length} step-required), ledger ${ledgerOk ? "exact" : "MISMATCH"}`, "all", { notStepRequired: falls.filter(j => !j.res.stepRequired).map(j => `${j.human} ${j.sc.dir}${j.sc.J}`) });
  // 2.5 controller cost (V2-REF quiet stance 60 s)
  const ref0 = S0.find(j => j.human === "V2-REF"), cost = ref0 ? ref0.res.cpuCtrl : null;
  add("2.5", "controller cost mean ≤ 0.15 ms per tick per player (V2-REF quiet stance 60 s); p99 reported", cost && cost.meanMs <= 0.15, cost ? `mean ${num(cost.meanMs, 3)} ms, p99 ${num(cost.p99Ms, 3)} ms` : "—", "mean ≤ 0.15 ms");
  // S4
  const S4 = by("S4").filter(j => [4, 8].includes(j.sc.H)), f4 = S4.map(j => ({ axis: j.sc.axis, H: j.sc.H, ok: inPlace(j.res, 10) && j.res.trunk.devFinalDeg <= 3, out: j.res.outcome, slip: mx(j.res.feet.slipMaxMm), trunk: j.res.trunk.devFinalDeg }));
  add("S4", "angular impulses yaw / pitch / roll at 4 and 8 N·m·s: recovered in place, slip ≤ 10 mm, final trunk within 3°", f4.length === 6 && f4.every(x => x.ok), `${f4.filter(x => x.ok).length}/6`, "6/6", { detail: f4 });
  // S5
  const S5 = by("S5"), f5 = S5.map(j => ({ name: j.sc.name, ok: !j.res.fell && j.res.recovered && j.res.recoveryT != null && j.res.recoveryT <= 3 && mx(j.res.feet.slipMaxMm) <= 2 && j.res.trunk.devFinalDeg <= 3, settle: j.res.recoveryT, slip: mx(j.res.feet.slipMaxMm), trunk: j.res.trunk.devFinalDeg }));
  add("S5", "10 initial offsets: no fall, QUIET from ≤ 3 s to the end, slip ≤ 2 mm, final trunk within 3°", f5.length === 10 && f5.every(x => x.ok), `${f5.filter(x => x.ok).length}/10`, "10/10", { detail: f5 });
  // F foot / CoP
  const RS = by("copSweep"), fr = RS.map(j => ({ dir: j.sc.dir, ok: !j.res.fell && mx(j.res.feet.slipMaxMm) <= 2 && j.res.extra.ramp.maxNetJumpMm <= 5 && j.res.extra.ramp.maxTrackErrMm <= 5, ...j.res.extra.ramp, slip: mx(j.res.feet.slipMaxMm) }));
  const penRuns = all.filter(j => ["S0", "S4", "S5"].includes(j.group) || (j.group === "push" && req.includes(j))), penOk = penRuns.every(j => j.res.g1.contacts.turfPenMaxMm <= 10 && j.res.g1.contacts.turfPenRestMm <= 5);
  add("F", "foot / CoP: sweep smoothness (net CoP change ≤ 5 mm/tick, tracking ≤ 5 mm, slip ≤ 2 mm) + turf penetration ≤ 10 / 5 mm in 2.1 / 2.2a / S4 / S5", fr.length === 6 && fr.every(x => x.ok) && penOk,
    `sweeps ${fr.filter(x => x.ok).length}/6, max jump ${num(mx(fr.map(x => x.maxNetJumpMm)), 2)} mm, max track ${num(mx(fr.map(x => x.maxTrackErrMm)), 2)} mm; penetration ${penOk ? "ok" : "FAIL"} (max ${num(mx(penRuns.map(j => j.res.g1.contacts.turfPenMaxMm)), 2)} mm)`, "all", { detail: fr });
  // D determinism
  const D = by("determinism"), grp = {}; for (const j of D) { const k = JSON.stringify(j.sc); (grp[k] || (grp[k] = [])).push(j.res.hash); }
  const detOk = Object.values(grp).every(h => h.length === 3 && h.every(x => x === h[0])), snap = by("snapshot"), snapOk = snap.length === 3 && snap.every(j => j.exact);
  const br = ext.browser; add("D", "determinism ×3 (6 curated), snapshot / restore bit-exact (3), browser = Node (curated)", detOk && snapOk && br && br.allPass,
    `×3 ${Object.values(grp).filter(h => h.every(x => x === h[0])).length}/${Object.keys(grp).length}, snapshot ${snap.filter(j => j.exact).length}/${snap.length}, browser ${br ? `${br.pass}/${br.n}` : "not run"}`, "all", { hashes: grp });
  // E energy / authority
  const res = gate.map(j => j.res.ledger.closure), eOk = gate.every(j => j.res.ledger.authorityWrites === 0) && res.every(x => x <= 0.5);
  add("E", "energy residual ΔE − (W_active + W_ext − damping) ≤ +0.5 J per run; authority writes 0", eOk, `max residual ${num(mx(res), 3)} J, min ${num(Math.min(...res), 2)} J over ${gate.length} runs`, "≤ +0.5 J");
  // R earlier gates
  const reg = ext.regression; add("R", "G0 8/8; G1 curated hashes and full results unchanged", reg && reg.g0 && reg.g1curated && reg.g1full, reg ? `G0 ${reg.g0 ? "8/8" : "FAIL"}, G1 curated ${reg.g1curated ? "10/10" : "FAIL"}, G1 full ${reg.g1full ? "unchanged" : "CHANGED"}` : "not run", "all");
  return { checks, pass: checks.every(c => c.pass), boundaries: B };
}
