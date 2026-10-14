// SP2A START-TRANSITION analysis (reads records; nothing is simulated): one time axis from the RUN-1 run-in (kinematic animation, t < 0) through
// the commitment touchdown (t = 0: the physical body is activated in the run's own state) to the first ~0.2 s airborne. Series: both feet's
// ground contact, pelvis / COM height and forward travel, COM horizontal / vertical velocity, pelvis angular velocity (world pitch / roll / yaw),
// both hips' flexion / abduction / rotation rates, both knees (flexion and joint height), take-off (last plant-foot contact) and the first
// later turf contact. Boundary continuity: |Δ joint angle| and |Δ joint rate| between the last animated frame and the physical state, COM
// position / velocity jump. Flight legitimacy: the COM acceleration while NO body touches the turf (must be gravity: 0, −9.81, 0).
// usage (worktree root): node sp2a_transition.mjs --rec sp2a.json.gz [--sp2 SP2_5.json.gz] --out dir [--t0 -0.4 --t1 0.5]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), EN = await import(S1 + "sp_entry.mjs"), AA = await import(new URL("./sp2a_author.mjs", import.meta.url).href);
const { V, Q, B, bi } = L, D = 180 / Math.PI, H = 1 / 240;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const t0 = +arg("t0", "-0.4"), t1 = +arg("t1", "0.5");
const rotRate = (Ra, Rb, dt) => { const dq0 = Q.norm(Q.mul(Rb, Q.conj(Ra))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]); if (s < 1e-12) return [0, 0, 0]; return V.sc([dq[0] / s, dq[1] / s, dq[2] / s], 2 * Math.atan2(s, dq[3]) / dt); };
// frames: { t, S (pos/rot), contact: { L, R, other: [] }, kin } — run-in frames, the entry state at t = 0, then the physical records
export function framesOf(o) { const out = [];
  if (o.runIn) for (const f of o.runIn) out.push({ t: f.t + (o.runInOffset || 0), S: f.S, contact: { L: !!f.stance.L, R: !!f.stance.R, other: [] }, kin: true, phase: f.phase || "run" });
  const E = o.entrySpec ? EN.buildEntry(o.entrySpec) : null; if (E) out.push({ t: 0, S: E.pose, vel: E.vel, contact: { L: true, R: false, other: [] }, kin: false, entry: true });
  for (const r of o.recs) { const S = r.S.slice(0, B.length), cs = r.contacts.filter(c => c.kind.startsWith("turf") && c.Jn > 0).map(c => (c.a === "turf" ? c.b : c.a)[1]);
    out.push({ t: r.t, S, contact: { L: cs.includes("foot_L"), R: cs.includes("foot_R"), other: cs.filter(x => !x.startsWith("foot_")) }, kin: false, P: r.chars.tackler.P }); }
  return out; }
export function series(o) { const F = framesOf(o), n = F.length, rows = [];
  for (let k = 0; k < n; k++) { const f = F[k], S = f.S, com = L.comOf(S), an = L.anatOf(S), K = L.skel(S);
    rows.push({ t: f.t, kin: f.kin, entry: !!f.entry, phase: f.phase, cL: f.contact.L, cR: f.contact.R, other: f.contact.other, pelY: S[0].pos[1], pelZ: S[0].pos[2], comY: com[1], comZ: com[2], comX: com[0], an, kneeY: { L: K.knee_L[1], R: K.knee_R[1] }, rot: S[0].rot, P: f.P, vel: f.vel }); }
  // velocities: physical records carry momentum (COM velocity = P / M); kinematic frames by central differences (one-sided at the ends)
  for (let k = 0; k < n; k++) { const r = rows[k], a = rows[Math.max(0, k - 1)], b = rows[Math.min(n - 1, k + 1)], dt = b.t - a.t || H;
    if (r.P) { r.vz = r.P[2] / L.M; r.vy = r.P[1] / L.M; r.vx = r.P[0] / L.M; } else if (r.vel) { const Pm = r.vel.reduce((s, x, i) => V.add(s, V.sc(x.v, B[i].mass)), [0, 0, 0]); r.vz = Pm[2] / L.M; r.vy = Pm[1] / L.M; r.vx = Pm[0] / L.M; }
    else { r.vz = (b.comZ - a.comZ) / dt; r.vy = (b.comY - a.comY) / dt; r.vx = (b.comX - a.comX) / dt; }
    r.vh = Math.hypot(r.vx, r.vz);
    // pelvis angular velocity in the pelvis' own heading frame: pitch (about the lateral axis, + = nose down), roll (about forward, + = left side down), yaw
    const w = rotRate(a.rot, b.rot, dt), fw = Q.rot(r.rot, [0, 0, 1]), hz = V.norm([fw[0], 0, fw[2]]), lat = [hz[2], 0, -hz[0]];
    r.wPitch = V.dot(w, lat); r.wRoll = V.dot(w, hz); r.wYaw = w[1];
    r.rate = {}; for (const j of ["hip_L", "hip_R", "knee_L", "knee_R"]) { r.rate[j] = {}; for (const key of Object.keys(r.an[j])) r.rate[j][key] = (b.an[j][key] - a.an[j][key]) / dt; } }
  // events: take-off = last plant-foot (L) contact of the first stance after t = 0; next contacts
  const after = rows.filter(r => r.t > 0), toff = (() => { let last = null; for (const r of after) { if (r.cL) last = r.t; else if (last != null) return last; } return last; })();
  const air = toff == null ? null : after.find(r => r.t > toff && (r.cL || r.cR || r.other.length)), firstBody = after.find(r => r.other.length);
  const freeBoot = after.find(r => r.cR);
  // flight legitimacy: COM acceleration (from momentum) on steps where no body touches the turf
  const fl = []; for (let k = 1; k < rows.length - 1; k++) { const r = rows[k], a = rows[k - 1], b = rows[k + 1]; if (r.kin || a.kin || !r.P || !a.P || !b.P || r.cL || r.cR || r.other.length || a.cL || a.cR || a.other.length || b.cL || b.cR || b.other.length) continue;
    fl.push({ t: r.t, ay: (b.vy - a.vy) / (b.t - a.t), ah: Math.hypot(b.vx - a.vx, b.vz - a.vz) / (b.t - a.t) }); }
  // boundary continuity: last animated frame vs the physical entry state (pose) and joint rates (animation: central difference; physics: entry rates)
  const kLast = rows.findIndex(r => !r.kin) - 1, ra = rows[kLast], re = rows[kLast + 1], rp = rows[kLast + 2];
  let dAng = 0, dRate = 0, worst = null; if (ra && re) for (const [j, v] of Object.entries(re.an)) for (const [key, x] of Object.entries(v)) { const d = Math.abs(x - ra.an[j][key]); if (d > dAng) { dAng = d; worst = `${j}.${key}`; } }
  const rateA = o.entrySpec ? o.entrySpec.rate : null; let dRateW = null; if (ra && rp && rateA) for (const [j, v] of Object.entries(rateA)) for (const [key, x] of Object.entries(v)) { const kin = (re.an[j][key] - rows[kLast - 1].an[j][key]) / (re.t - rows[kLast - 1].t), d = Math.abs(x - kin); if (d > dRate) { dRate = d; dRateW = `${j}.${key}`; } }
  // SEAM: the physical body's departure from RUN-1's own continuation (pose AND velocity) at +1 step, +25 ms, +50 ms — joint angles (max |Δ|),
  // pelvis angular velocity (|Δω|, rad/s) — and the largest pelvis angular-velocity departure over the first 60 ms
  let seam = null; if (o.run1Cont) { const C = o.run1Cont, at = (tt) => { let k = 0; while (k + 1 < C.length && C[k + 1].t <= tt + 1e-9) k++; return k; };
    const wR = (k) => { const a = C[Math.max(0, k - 1)], b = C[Math.min(C.length - 1, k + 1)]; return rotRate(a.pelvisRot, b.pelvisRot, b.t - a.t); };
    const dep = (r) => { const k = at(r.t), c = C[k]; let dA = 0, w = null; for (const [j, v] of Object.entries(c.anat)) for (const [key, x] of Object.entries(v)) { const d = Math.abs((r.an[j] && r.an[j][key] != null ? r.an[j][key] : x) - x); if (d > dA) { dA = d; w = j + "." + key; } }
      const ri = rows.indexOf(r), a = rows[ri - 1], b = rows[ri + 1], wp = rotRate(a.rot, b.rot, b.t - a.t), dw = V.len(V.sub(wp, wR(k))); return { t: +r.t.toFixed(4), maxDeltaAngleDeg: +dA.toFixed(2), worst: w, pelvisDeltaW: +dw.toFixed(2) }; };
    const phys = rows.filter(r => !r.kin && !r.entry && r.t > 0 && r.t <= 0.06), pick = (tt) => phys.reduce((b, r) => Math.abs(r.t - tt) < Math.abs(b.t - tt) ? r : b, phys[0]);
    const all = phys.slice(0, -1).map(dep); seam = { at4ms: dep(pick(1 / 240)), at25ms: dep(pick(0.025)), at50ms: dep(pick(0.05)), maxPelvisDeltaW60ms: +Math.max(...all.map(x => x.pelvisDeltaW)).toFixed(2) }; }
  // BOUNDARY SPIKES (model-independent seam check): joint angular acceleration (second difference of every anatomical angle, deg/s²) within ±3
  // frames of each boundary (run → authored flight at t_TO, flight → physics at 0), vs the largest the run itself shows over its last stride
  const acc = (i) => { const a = rows[i - 1], b = rows[i], c = rows[i + 1]; if (!a || !c) return 0; const h1 = b.t - a.t, h2 = c.t - b.t; if (!(h1 > 0 && h2 > 0)) return 0; let mx = 0;
    for (const [j, v] of Object.entries(b.an)) for (const [key, x] of Object.entries(v)) { if (!a.an[j] || !c.an[j] || a.an[j][key] == null || c.an[j][key] == null) continue; const d = Math.abs(2 * ((c.an[j][key] - x) / h2 - (x - a.an[j][key]) / h1) / (h1 + h2)); if (d > mx) mx = d; } return mx; };
  const runIdx = rows.map((r, i) => [r, i]).filter(([r]) => r.kin && r.phase !== "flight" && r.t > (rows.find(x => x.phase === "flight") ? rows.find(x => x.phase === "flight").t : 0) - 0.66).map(([, i]) => i);
  const runMax = Math.max(0, ...runIdx.slice(1, -1).map(acc)), near = (t0) => Math.max(0, ...rows.map((r, i) => [r, i]).filter(([r]) => Math.abs(r.t - t0) <= 3.5 / 240).map(([, i]) => acc(i)));
  const flF = rows.find(r => r.phase === "flight"), spikes = { runStrideMaxDegS2: +runMax.toFixed(0), atToeOff: flF ? +near(flF.t - 1 / 240).toFixed(0) : null, atTouchdown: +near(0).toFixed(0) };
  return { seam, spikes, rows, events: { takeoff: toff, airUntil: air ? air.t : null, airBodies: air ? [air.cL ? "foot_L" : null, air.cR ? "foot_R" : null, ...air.other].filter(Boolean) : null, firstBody: firstBody ? { t: firstBody.t, bodies: firstBody.other } : null, freeBootFirst: freeBoot ? freeBoot.t : null },
    continuity: { lastAnimT: ra ? ra.t : null, maxDeltaAngleDeg: +dAng.toFixed(2), worstAngle: worst, maxDeltaRateDegS: +dRate.toFixed(1), worstRate: dRateW, comJumpMM: ra && re ? +(1000 * Math.hypot(re.comY - ra.comY - ra.vy * (re.t - ra.t), re.comZ - ra.comZ - ra.vz * (re.t - ra.t))).toFixed(1) : null,
      comVelJump: ra && re ? +Math.hypot(re.vy - ra.vy, re.vz - ra.vz).toFixed(3) : null },
    flight: fl.length ? { steps: fl.length, meanAy: +(fl.reduce((s, x) => s + x.ay, 0) / fl.length).toFixed(3), maxAyDev: +Math.max(...fl.map(x => Math.abs(x.ay + 9.81))).toFixed(3), maxAh: +Math.max(...fl.map(x => x.ah)).toFixed(3) } : null }; }
// ── SVG plot ──
export function svg(runs, opts = {}) { const W = 1100, PH = 150, GAP = 34, X0 = 70, X1 = W - 20, tA = opts.t0 ?? t0, tB = opts.t1 ?? t1, xs = (t) => X0 + (t - tA) / (tB - tA) * (X1 - X0);
  const panels = [
    { title: "foot contacts (bars: L plant / R free) · non-foot turf contact (dots)", kind: "contact" },
    { title: "COM height (solid) and pelvis height (dashed), m", ser: [["comY", 1], ["pelY", 1, "4,3"]], lo: 0, hi: 1.15 },
    { title: "COM velocity: horizontal v_h (solid), vertical v_y (dashed), m/s", ser: [["vh", 1], ["vy", 1, "4,3"]], lo: -3, hi: 6 },
    { title: "pelvis angular velocity, rad/s: pitch + nose-down (solid), roll + fold-side-down (dashed), yaw (dotted)", ser: [["wPitch", 1], ["wRoll", 1, "4,3"], ["wYaw", 1, "1,3"]], lo: -8, hi: 8 },
    { title: "hip flexion rate, deg/s: L plant / fold (solid), R free / tackling (dashed)", ser: [[(r) => r.rate.hip_L.flex, 1], [(r) => r.rate.hip_R.flex, 1, "4,3"]], lo: -900, hi: 900 },
    { title: "knee flexion, deg: L (solid), R (dashed)", ser: [[(r) => r.an.knee_L.flex, 1], [(r) => r.an.knee_R.flex, 1, "4,3"]], lo: 0, hi: 150 },
    { title: "knee joint height, m: L (solid), R (dashed)", ser: [[(r) => r.kneeY.L, 1], [(r) => r.kneeY.R, 1, "4,3"]], lo: 0, hi: 0.7 } ];
  const Ht = panels.length * (PH + GAP) + 60; let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Ht}" font-family="-apple-system,Helvetica,Arial" font-size="12"><rect width="${W}" height="${Ht}" fill="#0f1512"/>`;
  s += `<g>${runs.map((r, i) => `<rect x="${X0 + i * 190}" y="12" width="16" height="4" fill="${r.col}"/><text x="${X0 + 22 + i * 190}" y="18" fill="#dfe">${r.label}</text>`).join("")}</g>`;
  panels.forEach((p, pi) => { const y0 = 40 + pi * (PH + GAP), ys = (v) => y0 + PH - (Math.max(p.lo ?? 0, Math.min(p.hi ?? 1, v)) - (p.lo ?? 0)) / ((p.hi ?? 1) - (p.lo ?? 0)) * PH;
    s += `<text x="${X0}" y="${y0 - 6}" fill="#cfe9ff">${p.title}</text><rect x="${X0}" y="${y0}" width="${X1 - X0}" height="${PH}" fill="#16201b" stroke="#2c3d34"/>`;
    for (let t = Math.ceil(tA * 10) / 10; t <= tB + 1e-9; t += 0.1) s += `<line x1="${xs(t)}" x2="${xs(t)}" y1="${y0}" y2="${y0 + PH}" stroke="${Math.abs(t) < 1e-6 ? "#ffe7a3" : "#25352d"}" stroke-width="${Math.abs(t) < 1e-6 ? 1.5 : 1}"/><text x="${xs(t) - 12}" y="${y0 + PH + 13}" fill="#8aa">${t.toFixed(1)}</text>`;
    if (p.kind !== "contact") { if (p.lo < 0 && p.hi > 0) s += `<line x1="${X0}" x2="${X1}" y1="${ys(0)}" y2="${ys(0)}" stroke="#3a5045"/>`; s += `<text x="8" y="${y0 + 10}" fill="#8aa">${p.hi}</text><text x="8" y="${y0 + PH}" fill="#8aa">${p.lo}</text>`; }
    runs.forEach((run, ri) => { const rows = run.S.rows.filter(r => r.t >= tA && r.t <= tB);
      if (p.kind === "contact") { const yb = (lane) => y0 + 12 + (ri * 2 + lane) * 16; rows.forEach((r, k) => { const nx = rows[k + 1] ? xs(rows[k + 1].t) : xs(r.t) + 1;
          if (r.cL) s += `<rect x="${xs(r.t)}" y="${yb(0)}" width="${Math.max(1, nx - xs(r.t))}" height="9" fill="${run.col}"/>`; if (r.cR) s += `<rect x="${xs(r.t)}" y="${yb(1)}" width="${Math.max(1, nx - xs(r.t))}" height="9" fill="${run.col}" opacity="0.55"/>`;
          if (r.other.length) s += `<circle cx="${xs(r.t)}" cy="${yb(1) + 22}" r="1.6" fill="${run.col}"/>`; });
        s += `<text x="${X0 - 64}" y="${yb(0) + 8}" fill="${run.col}" font-size="10">${run.short} L</text><text x="${X0 - 64}" y="${yb(1) + 8}" fill="${run.col}" font-size="10">${run.short} R</text>`;
        const ev = run.S.events; if (ev.takeoff != null) s += `<line x1="${xs(ev.takeoff)}" x2="${xs(ev.takeoff)}" y1="${y0}" y2="${y0 + PH}" stroke="${run.col}" stroke-dasharray="2,2"/><text x="${xs(ev.takeoff) + 3}" y="${y0 + PH - 6 - ri * 12}" fill="${run.col}" font-size="10">take-off ${ev.takeoff.toFixed(3)}</text>`; return; }
      for (const [key, w, dash] of p.ser) { const get = typeof key === "function" ? key : (r) => r[key]; let d = ""; rows.forEach((r, k) => { const v = get(r); if (v == null || !Number.isFinite(v)) return; d += (d ? "L" : "M") + xs(r.t).toFixed(1) + "," + ys(v).toFixed(1); });
        s += `<path d="${d}" fill="none" stroke="${run.col}" stroke-width="${1.6 * w}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; } }); });
  return s + `<text x="${X0}" y="${Ht - 12}" fill="#8aa">t (s) from the commitment touchdown (t = 0, yellow). t &lt; 0: RUN-1 animation (kinematic presentation); t ≥ 0: physical body (no state written after t = 0).</text></svg>`; }
if (process.argv[1] && process.argv[1].endsWith("sp2a_transition.mjs")) { const OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  const runs = [{ label: "SP2A", short: "2A", col: "#ffcf4a", o: L.readGz(arg("rec")) }]; if (arg("sp2")) runs.push({ label: "SP2 (no run-in: entry state)", short: "SP2", col: "#6fd0ff", o: L.readGz(arg("sp2")) });
  for (const r of runs) { r.S = series(r.o); }
  fs.writeFileSync(OUT + "/transition_plot.svg", svg(runs));
  const summary = runs.map(r => ({ run: r.label, events: r.S.events, continuity: r.S.continuity, seam: r.S.seam, spikes: r.S.spikes, flight: r.S.flight, authoredFlight: r.o.flight || null }));
  fs.writeFileSync(OUT + "/transition_summary.json", JSON.stringify(summary, null, 1)); console.log(JSON.stringify(summary, null, 1)); }
