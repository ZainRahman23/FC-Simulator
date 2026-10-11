// IFM-1 GAMEPLAY-CAMERA PIXEL SCREENING (prereg §11) — POST-FREEZE PRESENTATION ANALYSIS; it cannot affect any gate.
// "Report actual projected landmark differences in pixels at 60 Hz. As a screening marker, note whether any struck-chain landmark differs from C0
//  by >= 2 pixels at two consecutive primary-window frames." Primary-window 60 Hz frames: n = 4, 8, 12 (16.7 / 33.3 / 50 ms; n = 0 is the shared
// entry); consecutive pairs (4, 8) and (8, 12). Two landmark sets, both reported: (a) the evaluator's struck-chain points (ifm1_eval.mjs CHAIN_LM +
// the fixture witness carried by the target body; V2 geometry), (b) the rendered rig joints of the struck chain (what the mesh shows).
// Pixels: the frozen viewer's rv1Proj with CAMERA_V1 (zoom 1, 1280 × 720), as returned by the capture page; an independent re-implementation of
// rv1GameCam / rv1Proj here cross-checks every projected point. Entry continuity: RUN-1 at τ0 vs the rendered physical entry state (all rig joints).
// usage: node ifm1_clip_screen.mjs <clip prep dir> <capture dir> <out.json>
import fs from "fs"; import path from "path";
const [CL, CAP, OUT] = process.argv.slice(2), W = 1280, H = 720, META = JSON.parse(fs.readFileSync(path.join(CL, "clip_meta.json")));
const proj = (id) => JSON.parse(fs.readFileSync(path.join(CAP, "proj", `${id}.json`))), data = (id) => JSON.parse(fs.readFileSync(path.join(CL, "clipdata", `${id}.json`)));
// independent CAMERA_V1 projection (run1_viewer.js rv1GameCam + rv1Persp + rv1Proj, zoom 1)
function camProj(simX, p) { const th = 22 * Math.PI / 180, C = [simX, 30, -(68 + 43)], r = [1, 0, 0], u = [0, Math.cos(th), Math.sin(th)], f = [0, -Math.sin(th), Math.cos(th)];
  const rows = [r, u, f.map(x => -x)], d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], v = rows.map(R => d(R, p) - d(R, C));
  const fpx = 360 / Math.tan(14 * Math.PI / 180), fy = 2 * fpx / 720, w = -v[2]; return [((fy / (W / H)) * v[0] / w * 0.5 + 0.5) * W, (0.5 - fy * v[1] / w * 0.5) * H]; }
const dpx = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : null), r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
const out = { tool: "ifm1_clip_screen.mjs", rule: "struck-chain landmark vs C0 ≥ 2 px at two consecutive primary-window 60 Hz frames (n 4/8 or 8/12) — a screening marker, not a substitute for visual review; failing it does not invalidate mechanics",
  crossCheck: {}, entry: {}, cells: {} };
// ── cross-check: page projections vs the independent re-implementation ──
{ let worst = 0, nPts = 0; for (const c of META.clips) { const P = proj(c.id), D = data(c.id), lead = JSON.parse(fs.readFileSync(path.join(CL, "clipdata", `LEAD_${c.state}.json`)));
    const seq = [...lead.f60.map(f => ({ simX: f.simX, joint: f.joint })), ...D.frames.filter(f => f.n % 4 === 0)];
    P.normal.forEach((fr, k) => { const s = seq[k]; fr.proj.joint.forEach((pp, i) => { const q = camProj(s.simX, s.joint[i]); worst = Math.max(worst, dpx(pp, q)); nPts++; });
      for (const set of ["lm", "lmR"]) for (const role in fr.proj[set]) for (const n in fr.proj[set][role]) { const q = camProj(s.simX, s[set][role][n]); worst = Math.max(worst, dpx(fr.proj[set][role][n], q)); nPts++; } }); }
  out.crossCheck = { points: nPts, maxDiffPx: worst, note: "page (float32 matrices) vs float64 re-implementation" }; }
// ── entry continuity in pixels: RUN-1 at τ0 vs the rendered entry (n = 0), with RUN-1's own last-frame motion for scale ──
for (const c of META.clips.filter(c => c.mode === "C0")) { const st = META.states[c.state], D = data(c.id), lead = JSON.parse(fs.readFileSync(path.join(CL, "clipdata", `LEAD_${c.state}.json`)));
  const f0 = D.frames[0], l14 = lead.f60[14], l13 = lead.f60[13], names = META.bones.map(b => b.name);
  const jump = names.map((n, i) => dpx(camProj(f0.simX, f0.joint[i]), camProj(f0.simX, st.tau0.joint[i]))), jumpTip = names.map((n, i) => dpx(camProj(f0.simX, f0.tip[i]), camProj(f0.simX, st.tau0.tip[i])));
  const run1Step = names.map((n, i) => dpx(camProj(l14.simX, l14.joint[i]), camProj(f0.simX, st.tau0.joint[i]))), run1Prev = names.map((n, i) => dpx(camProj(l13.simX, l13.joint[i]), camProj(l14.simX, l14.joint[i])));
  const mx = (a) => { const m = Math.max(...a); return { px: r3(m), bone: names[a.indexOf(m)] }; };
  out.entry[`${c.body}/${c.state}`] = { entryVsRun1Tau0: { joints: mx(jump), tips: mx(jumpTip), worldMm: r3(c.entryVsRun1Tau0.maxJointM * 1000), worldTipMm: r3(c.entryVsRun1Tau0.maxTipM * 1000) },
    run1OwnFrameMotion: { lastLeadToTau0: mx(run1Step), previousFrame: mx(run1Prev) }, perJointPx: Object.fromEntries(names.map((n, i) => [n, r3(jump[i])])) }; }
// ── per cell / mode: struck-chain landmarks vs C0, plus N–W / N–X and R0–RH1 (descriptive) ──
const PRIM = [4, 8, 12], ALL = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36];
const frameAt = (P, n) => P.normal.find(f => f.phase === "phys" && f.n === n);
function series(Pa, Pb, role, set) { return ALL.map(n => { const a = frameAt(Pa, n), b = frameAt(Pb, n); if (!a || !b) return { n, missing: true };
  const per = Object.fromEntries(Object.keys(a.proj[set][role]).map(k => [k, r3(dpx(a.proj[set][role][k], b.proj[set][role][k]))])); return { n, tMs: r3(n * 1000 / 240), maxPx: Math.max(...Object.values(per)), per, outsideControl: a.outsideControl || b.outsideControl }; }); }
const flag = (s) => { const m = Object.fromEntries(s.map(x => [x.n, x.maxPx])); const pairs = [[4, 8], [8, 12]].filter(([a, b]) => m[a] >= 2 && m[b] >= 2); return { flagged: pairs.length > 0, pairs, primaryMaxPx: r3(Math.max(...PRIM.map(n => m[n]))), allMaxPx: r3(Math.max(...s.filter(x => !x.missing).map(x => x.maxPx))) }; };
for (const c of META.clips.filter(c => c.mode !== "C0")) {
  const key = `${c.role}/${c.body}`, cell = out.cells[key] || (out.cells[key] = { role: c.role, body: c.body, state: c.state, modes: {} }), P = proj(c.id), P0 = proj(`C0_${c.body}_${c.state}`);
  const m = { vsC0: { evaluatorPoints: series(P, P0, c.role, "lm"), renderedJoints: series(P, P0, c.role, "lmR") } };
  m.screen = { evaluatorPoints: flag(m.vsC0.evaluatorPoints), renderedJoints: flag(m.vsC0.renderedJoints) };
  m.screen.marker = m.screen.evaluatorPoints.flagged || m.screen.renderedJoints.flagged ? "≥ 2 px vs C0 at two consecutive primary frames" : "below the 2 px screening marker";
  if (c.mode !== "N" && fs.existsSync(path.join(CAP, "proj", `N_${c.role}_${c.body}.json`))) { const PN = proj(`N_${c.role}_${c.body}`);
    m.vsN = { evaluatorPoints: flag(series(P, PN, c.role, "lm")), renderedJoints: flag(series(P, PN, c.role, "lmR")), seriesEvaluator: series(P, PN, c.role, "lm") }; }
  cell.modes[c.mode] = m; }
for (const role of ["SW", "PL", "SH", "TP"]) for (const mode of ["N", "W", "X"]) { const a = `${mode}_${role}_R0`, b = `${mode}_${role}_RH1`;
  if (!fs.existsSync(path.join(CAP, "proj", `${a}.json`)) || !fs.existsSync(path.join(CAP, "proj", `${b}.json`))) continue;
  (out.r0VsRh1 = out.r0VsRh1 || {})[`${role}/${mode}`] = { renderedJoints: flag(series(proj(a), proj(b), role, "lmR")) }; }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`cross-check: ${out.crossCheck.points} points, max ${out.crossCheck.maxDiffPx.toExponential(2)} px`);
for (const [k, e] of Object.entries(out.entry)) console.log(`entry ${k}: rendered entry vs RUN-1 τ0 max ${e.entryVsRun1Tau0.joints.px} px (${e.entryVsRun1Tau0.joints.bone}; ${e.entryVsRun1Tau0.worldMm} mm), tips ${e.entryVsRun1Tau0.tips.px} px (${e.entryVsRun1Tau0.tips.bone}) · RUN-1's own last frame motion ${e.run1OwnFrameMotion.lastLeadToTau0.px} px (${e.run1OwnFrameMotion.lastLeadToTau0.bone})`);
for (const [k, cell] of Object.entries(out.cells)) for (const [mode, m] of Object.entries(cell.modes)) {
  const ev = m.vsC0.evaluatorPoints, rj = m.vsC0.renderedJoints, f = (s) => s.filter(x => [4, 8, 12, 24, 36].includes(x.n)).map(x => `${x.n}:${x.maxPx.toFixed(2)}`).join(" ");
  console.log(`${k} ${mode}: vs C0 eval pts [${f(ev)}] flag ${m.screen.evaluatorPoints.flagged} · rendered [${f(rj)}] flag ${m.screen.renderedJoints.flagged}${m.vsN ? ` · vs N primary max ${m.vsN.evaluatorPoints.primaryMaxPx} / ${m.vsN.renderedJoints.primaryMaxPx} px` : ""}`); }
for (const [k, v] of Object.entries(out.r0VsRh1 || {})) console.log(`R0 vs RH1 ${k}: rendered primary max ${v.renderedJoints.primaryMaxPx} px, all ${v.renderedJoints.allMaxPx} px`);
