// SUPPORT-1 summary (read-only): the headline numbers of every evidence file, for the report and the review page.
// usage (worktree root): node .../s1_summary.mjs --dir <support1/evidence> --slider <dir with SLIDER_*.json.gz> --out <json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, D = arg("dir"), J = (f) => JSON.parse(fs.readFileSync(path.join(D, f)));
const out = {};
// 1. PVP-0 foot audit
{ const F = J("S1_PVP0_FEET.json"), X = J("S1_PVP0_CROSS.json"); out.pvp0 = {};
  for (const [c, v] of Object.entries(F.cases)) { const pk = v.peaks, s = v.series, maxN = (side) => Math.max(...s.map(r => r[side].N)), firstFall = null;
    const down = (X[c].pairs || []).filter(p => p.downNs > 20).map(p => ({ pair: p.pair, downNs: p.downNs, horizNs: p.Jh }));
    out.pvp0[c] = { firstContactT: v.firstContactT, strikeDir: v.strikeDirInRecipientFrame, struck: { slipMm: v.slipTotalMm.L, peakRatio: +pk.L.ratio.toFixed(3), peakN: Math.round(maxN("L")), maxRollDeg: +pk.L.roll.toFixed(1), unloadS: v.events.L.unload ?? null },
      far: { slipMm: v.slipTotalMm.R, peakRatio: +pk.R.ratio.toFixed(3), peakN: Math.round(maxN("R")), maxRollDeg: +pk.R.roll.toFixed(1), maxYawDeg: +pk.R.yaw.toFixed(1), unloadS: v.events.R.unload ?? null, liftS: v.events.R.lift ?? null }, downwardPins: down }; } }
// 2. lab sweeps + comparison
{ const C = J("S1_COMPARE.json"); out.compare = C.cands; const V = J("S1_SWEEP_V2.json"); out.labV2 = { twinQuiet: V.twinQuiet, determinism: V.determinism, runs: V.runs.length };
  // first falling momentum per direction × height (GRID, V2)
  const g = {}; for (const r of V.runs.filter(r => r.fam === "GRID")) { const [, d, h] = r.label.split("_"), k = d + "_" + h; (g[k] = g[k] || []).push(r); }
  out.labV2.fallOnset = Object.fromEntries(Object.entries(g).map(([k, rs]) => { rs.sort((a, b) => a.impactor.momentumNs - b.impactor.momentumNs); const f = rs.find(r => r.cls === "FALL"), fast = rs.find(r => r.cls === "FALL" && r.fallS < 0.5);
    return [k, { lowestFallingMomentumNs: f ? f.impactor.momentumNs : null, lowestFastFallMomentumNs: fast ? fast.impactor.momentumNs : null, n: rs.length }]; }));
  out.labV2.replay = Object.fromEntries(V.runs.filter(r => r.fam === "REPLAY").map(r => [r.label, { cls: r.cls, fallS: r.fallS, impulseNs: r.impulseNs, footL: r.feet.L.dispM, footR: r.feet.R.dispM }])); }
// 3. regressions
out.regress = {}; for (const f of fs.readdirSync(D).filter(f => /^S1_REGRESS_[A-Z0-9_]+\.json$/.test(f) && !/_Q\.json$/.test(f))) { const r = J(f); out.regress[r.candidate] = { pass: r.verdict.pass, nPass: r.verdict.nPass, n: r.verdict.n, failed: r.verdict.failed, thresholds: Object.fromEntries(Object.entries(r.T).map(([d, t]) => [d, +t.thresholdNs.toFixed(2)])), uHash: r.U.finalHash, det: r.D.identical, sway: r.U.copLowpassRmsMm, wallS: r.wallS }; }
// 4. exploratory slider
if (arg("slider")) { out.slider = {}; for (const f of fs.readdirSync(arg("slider")).filter(f => /^SLIDER_.*\.json\.gz$/.test(f))) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(arg("slider"), f)))), R = o.recs, A = o.setup.activate;
    const first = R.find(r => r.contacts.some(c => c.kind === "cross" && c.Jn > 0)), y = (q) => R[q].S[0].pos[1], fall = R.findIndex((r, q) => q > A && y(A) - r.S[0].pos[1] > 0.15);
    const fL0 = R[A].S[10].pos, fR0 = R[A].S[13].pos, at = (q) => ({ t: +((q - A) / 240).toFixed(2), pelvisY: +y(q).toFixed(3), footLdz: +(R[q].S[10].pos[2] - fL0[2]).toFixed(2), footRdz: +(R[q].S[13].pos[2] - fR0[2]).toFixed(2), comDz: +(R[q].chars.runner.com[2] - R[A].chars.runner.com[2]).toFixed(2), NL: Math.round(R[q].chars.runner.feet.L * 240), NR: Math.round(R[q].chars.runner.feet.R * 240) });
    out.slider[o.case] = { hash: o.finalHash, speed: o.speedFactor, firstContactT: first ? +((first.n - A) / 240).toFixed(3) : null, fallT: fall > 0 ? +((R[fall].n - A) / 240).toFixed(3) : null, trace: [24, 48, 72, 96, 144, 240].map(dq => at(Math.min(R.length - 1, A + dq))),
      maxCrossPenMm: +Math.max(...R.map(r => r.chars.runner.integrity.crossPenMm)).toFixed(2), recipientHardExcDeg: +Math.max(...R.map(r => r.chars.runner.integrity.hardExcDeg)).toFixed(2), sliderHardExcDeg: +Math.max(...R.map(r => r.chars.tackler.integrity.hardExcDeg)).toFixed(2), eqOppMax: Math.max(...R.filter(r => r.eqOpp).map(r => r.eqOpp.dJ)) }; } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1).slice(0, 6000));
