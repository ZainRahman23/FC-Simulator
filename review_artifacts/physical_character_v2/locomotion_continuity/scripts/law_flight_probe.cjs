// LC-1 design probe (read-only): the law's pelvis term over one cycle vs a COM-ballistic flight from the law's own take-off state; foot clearance.
const H = require("./pres_harness.cjs"), P = H.loadPres(process.argv[2]), g = P.g;
const skel = g("ofCharSkeleton")({ rig: JSON.parse(JSON.stringify(P.rig)), skel: null }), cyc = g("ofLocoCycle"), params = g("ofLocoParams"), skelFK = g("skelFK"), M4 = g("M4");
const MASS = { pelvis: [0.1117, 0.5], spine: [0.1633, 0.5], chest: [0.1596, 0.5], head: [0.0694, 0.5], upperArm: [0.0271, 0.577], foreArm: [0.0162, 0.457], hand: [0.0061, 0.5], thigh: [0.1416, 0.41], shin: [0.0433, 0.446], foot: [0.0137, 0.5] };
const segs = skel.bones.map(b => { const k = b.name.replace(/_[RL]$/, ""); return MASS[k] ? { b, m: MASS[k][0], c: MASS[k][1] } : null; }).filter(Boolean), Mt = segs.reduce((s, x) => s + x.m, 0);
function at(v, u, lastBob, pelY) { const G = params(v), c = cyc(skel, G, u, { lean: 0, turnRoll: 0, twist: 0, lastBob }); const pel = skel.byName.pelvis, sv = pel.off.slice(); const y = pelY != null ? pelY : c._pelvis[1]; pel.off = [sv[0], sv[1] + y, sv[2]];
  const fk = skelFK(skel, c, M4.ident()); pel.off = sv; let cy = 0; for (const s of segs) { const j = fk.joint[s.b.idx], tp = fk.tip[s.b.idx]; cy += (j[1] + (tp[1] - j[1]) * s.c) * s.m / Mt; }
  let foot = Infinity; for (const sd of ["R", "L"]) { const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd]; foot = Math.min(foot, fk.joint[fb.idx][1] - skel.ankleH, fk.tip[tb.idx][1] - 0.005); }
  return { c, y, cy, foot }; }
for (const v of [3, 5.5, 7.5]) { const G = params(v), cad = v / (G.step * 0.865), T = 2 / cad, N = 2000, dt = T / N; let lb = null; const S = [];
  for (let n = 0; n <= N; n++) { const u = n / N; const e = at(v, u, lb); if (!e.c._flight) lb = e.c._bob; S.push({ u, ...e }); }
  // first flight interval after u = 0 (R stance ends at S)
  let i0 = S.findIndex(e => e.c._flight), i1 = i0; while (S[i1 + 1].c._flight) i1++;
  const yTO = S[i0 - 1].cy, vTO = (S[i0 - 1].cy - S[i0 - 3].cy) / (2 * dt), lines = [];
  let minClearBall = Infinity, minClearLaw = Infinity;
  for (let i = i0; i <= i1 + 1; i++) { const tau = (i - (i0 - 1)) * dt, yc = yTO + vTO * tau - 9.81 * tau * tau / 2; const com0 = S[i].cy - S[i].y; const yb = yc - com0; const eb = at(v, S[i].u, null, yb);
    minClearBall = Math.min(minClearBall, eb.foot); minClearLaw = Math.min(minClearLaw, S[i].foot); if ((i - i0) % Math.max(1, Math.floor((i1 - i0) / 4)) === 0 || i === i1 + 1) lines.push(`u ${S[i].u.toFixed(3)} law ${(S[i].y * 1000).toFixed(1)} ball ${(yb * 1000).toFixed(1)} mm  footLaw ${(S[i].foot * 1000).toFixed(1)} footBall ${(eb.foot * 1000).toFixed(1)}`); }
  const yL = S[i1 + 1].y; console.log(`v ${v}: flight u ${S[i0].u.toFixed(3)}–${S[i1].u.toFixed(3)} (${((i1 - i0 + 1) * dt * 1000).toFixed(0)} ms); take-off COM vy ${vTO.toFixed(3)} m/s; law pelvis TO ${(S[i0 - 1].y * 1000).toFixed(1)} → landing ${(yL * 1000).toFixed(1)} mm; min foot clearance law ${(minClearLaw * 1000).toFixed(1)} ball ${(minClearBall * 1000).toFixed(1)} mm`);
  for (const l of lines) console.log("   ", l); }
