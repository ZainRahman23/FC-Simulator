// SLIDE-PHYS-1 measurement of one tackler record (PVP-0 record format; solo: bodies 0…13 = the tackler).
// Per step: COM, COM velocity (momentum / M), horizontal / vertical split, pelvis + thorax orientation (belly normal, recline), turf contacts per
// body (normal impulse, tangential impulse, slip speed at the contact point), lowest point / penetration, tackling-limb velocities, energy.
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, M, G, bi } = L;
const NAMES = B.map(b => b.name);
export function series(out, opts = {}) { const R = out.recs, h = 1 / 240, rows = [], role = opts.role || "tackler", off = opts.bOff || 0;
  const first = {}, Jtot = {}, Jt = {}, slipMax = {};
  for (const r of R) { const S = r.S.slice(off, off + B.length), c = r.chars[role], vcom = V.sc(c.P, 1 / M), t = (r.n - (opts.n0 || 0)) * h;
    const pel = S[0], th = S[bi("thorax")], belly = Q.rot(pel.rot, [0, 0, 1]), up = Q.rot(pel.rot, [0, 1, 0]), thUp = Q.rot(th.rot, [0, 1, 0]), thFwd = Q.rot(th.rot, [0, 0, 1]);
    const turf = {}; for (const ct of r.contacts) { if (!ct.kind.startsWith("turf")) continue; const side = ct.a === "turf" ? ct.b : ct.a; if (!Array.isArray(side) || side[0] !== role) continue; const nm = side[1];
      const Jn = ct.Jn, J2 = ct.J2, sg = ct.a === "turf" ? 1 : -1, Jw = V.sc(J2, sg), Jtan = Math.hypot(Jw[0], Jw[2]);   // impulse ON the body (turf normal = +y)
      const p = ct.points[0] ? ct.points[0].p : null, i = bi(nm), vp = p ? L.IL.velAt(S[i], S[i].com, p) : [0, 0, 0], slip = Math.hypot(vp[0], vp[2]);
      const e = turf[nm] || (turf[nm] = { Jn: 0, Jy: 0, Jtan: 0, slip: 0, maxDepth: 0 }); e.Jn += Jn; e.Jy += Jw[1]; e.Jtan += Jtan; e.slip = Math.max(e.slip, Jn > 0 ? slip : 0); e.maxDepth = Math.max(e.maxDepth, ...ct.points.map(q => q.depth));
      if (Jn > 0 && first[nm] == null) first[nm] = t; Jtot[nm] = (Jtot[nm] || 0) + Jw[1]; Jt[nm] = (Jt[nm] || 0) + Jtan; if (Jn > 0) slipMax[nm] = Math.max(slipMax[nm] || 0, slip); }
    const fR = S[bi("foot_R")], sR = S[bi("shank_R")];
    rows.push({ n: r.n, t, com: c.com, v: vcom, vh: Math.hypot(vcom[0], vcom[2]), vy: vcom[1], belly, bellyY: belly[1], upY: up[1], reclineDeg: Math.acos(Math.max(-1, Math.min(1, thUp[1]))) * 180 / Math.PI, thFwdY: thFwd[1],
      pelvisY: pel.pos[1], pelvisV: pel.v, footR_v: fR.v, shankR_v: sR.v, turf, L: c.L_O, E: c.E, Wact: c.Wact, D: c.D, integ: c.integrity, sat: c.sat, Jturf: c.Jturf }); }
  return { rows, first, Jtot, Jt, slipMax }; }
export function events(S) { const R = S.rows, ev = {}; const air = (r) => Object.values(r.turf).every(x => x.Jn <= 0);
  ev.firstNonFoot = Object.entries(S.first).filter(([k]) => !/^foot_/.test(k)).sort((a, b) => a[1] - b[1]);
  ev.firstContacts = Object.entries(S.first).sort((a, b) => a[1] - b[1]).map(([k, t]) => [k, +t.toFixed(4)]);
  const sideEntry = ev.firstNonFoot.length ? ev.firstNonFoot[0][1] : null; ev.groundEntryT = sideEntry;
  if (sideEntry != null) { const r = R.find(x => x.t >= sideEntry - 1e-9); ev.atEntry = { t: r.t, vh: r.vh, vy: r.vy, comY: r.com[1], bellyY: r.bellyY, reclineDeg: r.reclineDeg }; }
  ev.minBellyY = Math.min(...R.map(r => r.bellyY)); ev.faceDownSteps = R.filter(r => r.bellyY < -0.7).length;
  const stop = R.find(r => r.t > 0.2 && r.vh < 0.3); ev.stopT = stop ? stop.t : null; ev.final = { t: R[R.length - 1].t, com: R[R.length - 1].com, vh: R[R.length - 1].vh };
  ev.slideDist = R.length ? Math.hypot(R[R.length - 1].com[0] - (R.find(r => r.t >= (sideEntry ?? 0)) || R[0]).com[0], R[R.length - 1].com[2] - (R.find(r => r.t >= (sideEntry ?? 0)) || R[0]).com[2]) : null;
  ev.maxPenMm = Math.max(...R.map(r => r.integ.turfPenMm)); ev.maxHardExcDeg = Math.max(...R.map(r => r.integ.hardExcDeg)); ev.airSteps = R.filter(air).length;
  ev.maxSelfPenMm = Math.max(...R.map(r => r.integ.selfPenMm || 0));
  return ev; }
export function table(S, every = 12) { const out = [];
  for (const r of S.rows.filter((_, i) => i % every === 0)) { const tc = Object.entries(r.turf).filter(([, x]) => x.Jn > 0).map(([k, x]) => `${k.replace("_", "")}:${(x.Jy * 240 / (M * G)).toFixed(2)}${x.slip > 0.3 ? "s" : ""}`).join(" ");
    out.push(`${r.t.toFixed(3)} com(${r.com.map(x => x.toFixed(2)).join(",")}) vh ${r.vh.toFixed(2)} vy ${r.vy.toFixed(2)} pel ${r.pelvisY.toFixed(2)} belly ${r.bellyY.toFixed(2)} recl ${r.reclineDeg.toFixed(0)} sat ${r.sat} | ${tc}`); }
  return out.join("\n"); }
