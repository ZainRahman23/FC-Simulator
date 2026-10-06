// ═══ physchar2/tools/swing_lag_analyze.mjs — DIAGNOSTIC analysis of tools/swing_lag_diag.mjs records: stage-by-stage amplitude ratio / phase (sinusoids) and effective delay
// (constant-velocity windows) along the swing command path, plus the hypothesis checks H1 (actuator realises the implicit law), H2 (IK-rate convention: ω* and ω_tfd vs the
// Jacobian-ideal ω_id), H3 (vff = (1 − s)(D + dt·K)·ω*), H4 (floating vs fixed pelvis — compare two records), H5 (liftoff record: lag vs the airborne weight a).
// usage: node tools/swing_lag_analyze.mjs <rec.json.gz> [...]
import fs from "fs"; import zlib from "zlib"; import { Q } from "../core/v2_math.js";
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
// least-squares fit x(t) ≈ A sin(wt) + B cos(wt) + c → amplitude, phase (rad)
function fit(ts, xs, w) { let S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0]; ts.forEach((t, i) => { const g = [Math.sin(w * t), Math.cos(w * t), 1]; for (let a = 0; a < 3; a++) { y[a] += g[a] * xs[i]; for (let b = 0; b < 3; b++) S[a][b] += g[a] * g[b]; } });
  const a = S.map((r, i) => [...r, y[i]]); for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; for (let r = 0; r < 3; r++) if (r !== c) { const k = a[r][c] / a[c][c]; for (let q = c; q <= 3; q++) a[r][q] -= k * a[c][q]; } }
  const [A, B] = a.map((r, i) => r[3] / r[i]); return { amp: Math.hypot(A, B), ph: Math.atan2(B, A) }; }
const wrapPi = (x) => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };
for (const file of process.argv.slice(2)) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), dt = r.dt, R = r.rows;
  console.log(`\n══ ${file.split("/").pop()} — ${r.human} ${r.side} ${r.hz} Hz, pelvis ${r.pelvis}, FF ${r.ff}, vff ${r.vff || "lin"}${r.liftoff ? ", LIFTOFF" : ""} (${R.length} paired ticks)`);
  const J = r.legJoints, axName = (j, i) => `${J[j].name.replace(/_[LR]$/, "")}.${J[j].axes[i] || "xyz"[i]}`;
  // ── H1: measured actuator torque vs the implicit law τ0 − (D + dt·K)·ω_end; H3: vff vs (1 − s)(D + dt·K)·ω* ──
  { let n = 0, e2 = 0, s2 = 0, worst = 0, sat = 0, nv = 0, ev2 = 0, sv2 = 0; for (const x of R) for (const jt of x.joints) jt.act && jt.act.forEach((a, i) => { if (!a || a.tau == null) return; const lim = a.tau >= a.hi - 1e-6 || a.tau <= a.lo + 1e-6; if (lim) { sat++; return; } const d = a.tau - a.law; n++; e2 += d * d; s2 += a.tau * a.tau; worst = Math.max(worst, Math.abs(d));
      const rw = jt.rows[i]; if (rw && jt.ikW) { const exp = (1 - x.s) * (rw.D + dt * rw.K) * jt.ikW[i]; nv++; ev2 += (rw.vff - exp) ** 2; sv2 += exp * exp; } });
    console.log(`H1 actuator law: rms |τ − (τ0 − (D+dt·K)·ω_end)| ${f2(Math.sqrt(e2 / n), 4)} N·m vs rms τ ${f2(Math.sqrt(s2 / n), 2)} N·m (worst ${f2(worst, 3)}); limited rows ${sat}/${n + sat}`);
    console.log(`H3 vff arithmetic: rms |vff − (1−s)(D+dt·K)·ω*| ${f2(Math.sqrt(ev2 / Math.max(1, nv)), 6)} N·m vs rms vff ${f2(Math.sqrt(sv2 / Math.max(1, nv)), 3)} N·m`); }
  // per trajectory
  const byK = {}; for (const x of R) (byK[x.k] = byK[x.k] || []).push(x);
  for (const k of Object.keys(byK)) { const X = byK[k], tr = r.traj[k], d = (x) => { const dd = tr.dir; return dd === "z" ? [0, 1, 0] : null; };
    // motion direction in the world from the reference velocity
    const vmax = X.reduce((b, x) => (Math.hypot(...x.ref.v) > Math.hypot(...b.ref.v) ? x : b), X[0]), dir = (() => { const v = vmax.ref.v, l = Math.hypot(...v); return l > 1e-9 ? v.map(q => q / l) : [0, 1, 0]; })();
    const proj = (v) => v[0] * dir[0] + v[1] * dir[1] + v[2] * dir[2];
    // dominant joint axes: the two largest ω_tfd variances
    const tfd = (x, j, i, prev) => (prev && prev.joints[j].tgt && x.joints[j].tgt ? (() => { const qa = prev.joints[j].tgt, qb = x.joints[j].tgt, sg = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(qa), qb.map(v => v * sg)); return 2 * dq[i] / dt; })() : null);
    const series = []; X.forEach((x, idx) => { const prev = idx ? X[idx - 1] : null; series.push(x.joints.map((jt, j) => [0, 1, 2].map(i => ({ tfd: tfd(x, j, i, prev), ws: jt.ikW ? jt.ikW[i] : null, wid: x.wid ? x.wid[j][i] : null, w0: jt.w0[i], w1: jt.w1 ? jt.w1[i] : null, e: jt.rows[i] && jt.rows[i].K > 0 ? (jt.rows[i].tau0 - jt.rows[i].ff - jt.rows[i].vff) / jt.rows[i].K : null })))); });
    const cand = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const v = series.map(s => s[j][i].wid).filter(q => q != null); if (v.length) cand.push({ j, i, var: mean(v.map(q => q * q)) }); }
    cand.sort((a, b) => b.var - a.var); const dom = cand.slice(0, 2);
    if (tr.F) {   // sinusoid: steady cycles only (exclude the envelope cycles)
      const w = 2 * Math.PI * tr.F, win = X.map((x, i) => [x, i]).filter(([x]) => x.u > tr.Te + 0.05 && x.u < tr.T - tr.Te - 0.05), ts = win.map(([x]) => x.u);
      const ref = fit(ts, win.map(([x]) => proj(x.ref.v)), w), foot = fit(ts, win.map(([x]) => proj(x.footEnd.v)), w), lagMs = (a) => wrapPi(ref.ph - a.ph) / w * 1000;
      console.log(`  ${tr.id} (${tr.F} Hz, ${tr.A * 1000} mm along ${tr.dir}): foot velocity amplitude ratio ${f2(foot.amp / ref.amp, 3)}, delay ${f2(lagMs(foot), 1)} ms`);
      for (const { j, i } of dom) { const g = (key) => fit(ts, win.map(([, idx]) => series[idx][j][i][key] ?? 0), w), id = g("wid"), F = (key) => { const a = g(key); return `${key} ×${f2(a.amp / id.amp, 3)} ${f2(wrapPi(id.ph - a.ph) / w * 1000, 1)} ms`; };
        console.log(`     ${axName(j, i).padEnd(12)} vs ω_id: ${F("tfd")} | ${F("ws")} | ${F("w1")} | joint error e amp ${f2(g("e").amp * 1000, 2)} mrad`); } }
    else if (tr.id.startsWith("CV")) { const Tr = tr.id.includes("Z") ? 0.1 : tr.id.includes("O") ? 0.12 : 0.15, win = X.map((x, i) => [x, i]).filter(([x]) => x.u > Tr + 0.15 && x.u < tr.T - Tr), v = mean(win.map(([x]) => proj(x.ref.v)));
      const eW = mean(win.map(([x]) => proj(x.footEnd.p.map((q, i) => q - x.ref.p[i])))), vF = mean(win.map(([x]) => proj(x.footEnd.v)));
      console.log(`  ${tr.id.padEnd(5)} v_ref ${f2(v * 1000, 0)} mm/s: foot v ${f2(vF * 1000, 1)} mm/s (×${f2(vF / v, 3)}); mean position error along motion ${f2(eW * 1000, 2)} mm → delay ${f2(-eW / v * 1000, 1)} ms`);
      for (const { j, i } of dom) { const m = (key) => mean(win.map(([, idx]) => series[idx][j][i][key]).filter(q => q != null)), wid = m("wid");
        console.log(`     ${axName(j, i).padEnd(12)} ω_id ${f2(wid, 4)} rad/s | ω_tfd ×${f2(m("tfd") / wid, 3)} | ω* ×${f2(m("ws") / wid, 3)} | ω_end ×${f2(m("w1") / wid, 3)} | joint error e ${f2(m("e") * 1000, 2)} mrad → joint LAG ${f2(m("e") / wid * 1000, 1)} ms`); } }
    else if (tr.id.startsWith("CH")) { /* chirp: windowed amplitude / delay vs frequency */ const out = []; for (const [f0, f1] of [[0.5, 1], [1, 1.5], [1.5, 2], [2, 2.5], [2.5, 3]]) { const tA = (f0 - 0.5) / 0.5, tB = (f1 - 0.5) / 0.5, fm = (f0 + f1) / 2, w = 2 * Math.PI * fm, win = X.filter(x => x.u >= tA && x.u < tB);
        if (win.length < 20) continue; const ts = win.map(x => x.u), rf = fit(ts, win.map(x => proj(x.ref.v)), w), ft = fit(ts, win.map(x => proj(x.footEnd.v)), w); out.push(`${f2(fm, 2)} Hz: ×${f2(ft.amp / rf.amp, 2)} ${f2(wrapPi(rf.ph - ft.ph) / w * 1000, 0)} ms`); }
      console.log(`  ${tr.id} chirp (approximate, windowed): ${out.join(" | ")}`); } }
  if (r.liftoff) { const X = R.filter(x => x.k === 0), pts = [0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.45].map(u => X.find(x => x.u >= u)).filter(Boolean);
    console.log("H5 liftoff: " + pts.map(x => `u ${f2(x.u, 2)} s a ${f2(x.a, 2)} err ${f2(Math.hypot(...x.footEnd.p.map((q, i) => q - x.ref.p[i])) * 1000, 2)} mm`).join(" | ")); } }
