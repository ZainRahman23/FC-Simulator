// PVP-1 collision review data (reads the frozen canonical records; nothing is simulated or changed): for PVP-F2 and PVP-F3 (and the TWIN where it
// applies), over first contact −0.30 s → +0.75 s:
//   first      the first player–player contact: step, bodies, points, normal and force on the recipient
//   log        every tackler-body × recipient-body pair that touched: first / last time (ms), steps in contact, peak force (N), impulse on the recipient
//              (N·s, recipient frame fwd / left / up)
//   bins       which pairs are in contact in each 25 ms bin
//   kin        at fixed times: the tackling (right) boot's velocity (m/s, along the tackler's travel / sideways / up) and height, the struck (right) boot's
//              velocity in the recipient frame, their separation (sole centres), both feet's turf loads (BW; and the TWIN's), the recipient COM velocity
// usage (worktree root): node pvp1_collision_data.mjs --runs <dir> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, B, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const h = 1 / 240, BW = L.M * 9.81, NB = B.length, r3 = (x) => Math.round(x * 1000) / 1000, r1 = (x) => Math.round(x * 10) / 10;
const sole = (S, s) => { const f = S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); };
const vAt = (s, p) => V.add(s.v, V.cross(s.w, V.sub(p, s.com)));
const runs = Object.fromEntries(["F2", "F3", "TWIN"].map(k => [k, L.readGz(`${arg("runs")}/CANON_${k}.json.gz`)])), meta = runs.TWIN.meta, qR = meta.qR, fwd = Q.rot(qR, [0, 0, 1]), left = Q.rot(qR, [1, 0, 0]);
const decR = (v) => [r3(V.dot(v, fwd)), r3(V.dot(v, left)), r3(v[1])], decT = (v) => [r3(v[2]), r3(v[0]), r3(v[1])];   // tackler frame: its travel is +z, its left +x
const first = (o) => { for (const r of o.recs) { const cs = r.contacts.filter(c => c.kind === "cross" && c.Jn > 0); if (cs.length) return { n: Math.round(r.t / h), r, cs }; } return null; };
const rec = (o, n) => o.recs[Math.max(0, Math.min(o.recs.length - 1, n - 1))];
const loads = (r) => { const o = { L: 0, R: 0 }; if (!r.recipientActive) return null; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === "runner" && /^foot_/.test(x[1])) o[x[1].slice(-1)] += c.Jn / h / BW; } return { L: r3(o.L), R: r3(o.R) }; };
const out = { note: "PVP-1 CANON collision review data (frozen records)", window: [-0.3, 0.75], frames: { recipientFrame: "fwd = its running direction, left = its left", tacklerFrame: "along = its travel, side = its left" } };
const F1 = first(runs.F2), nC = F1.n; out.firstContactStep = nC; out.firstContactT = r3(nC * h);
for (const k of ["F2", "F3"]) { const o = runs[k], f = first(o), R = {};
  R.first = { step: f.n, ms: Math.round((f.n - nC) * h * 1000), contacts: f.cs.map(c => { const rA = c.a[0] === "runner", n = rA ? V.sc(c.n, -1) : c.n, J = rA ? V.sc(c.J2, -1) : c.J2;
    return { recipient: rA ? c.a[1] : c.b[1], tackler: rA ? c.b[1] : c.a[1], points: c.points.map(p => p.p.map(r3)), normalOnRecipient: decR(n), forceOnRecipientN: decR(V.sc(J, 1 / h)), normalN: Math.round(c.Jn / h) }; }) };
  const log = {}, bins = {};
  for (let n = nC - 72; n <= nC + 180; n++) { const r = rec(o, n), ms = Math.round((n - nC) * h * 1000);
    for (const c of r.contacts) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; const rA = c.a[0] === "runner", key = `${rA ? c.b[1] : c.a[1]} → ${rA ? c.a[1] : c.b[1]}`, J = rA ? V.sc(c.J2, -1) : c.J2, Fm = V.len(J) / h;
      const e = log[key] = log[key] || { firstMs: ms, lastMs: ms, steps: 0, peakN: 0, peakMs: ms, J: [0, 0, 0] }; e.lastMs = ms; e.steps++; if (Fm > e.peakN) { e.peakN = Fm; e.peakMs = ms; } e.J = V.add(e.J, J);
      const b = Math.floor(ms / 25) * 25; (bins[b] = bins[b] || new Set()).add(key); } }
  R.log = Object.entries(log).sort((a, b) => a[1].firstMs - b[1].firstMs).map(([key, e]) => ({ pair: key, firstMs: e.firstMs, lastMs: e.lastMs, steps: e.steps, peakN: Math.round(e.peakN), peakMs: e.peakMs, impulseOnRecipientNs: decR(e.J) }));
  R.bins = Object.entries(bins).sort((a, b) => +a[0] - +b[0]).map(([b, s]) => [+b, [...s]]);
  R.kin = [-100, -50, -25, 0, 25, 50, 75, 100, 150, 200, 300, 400].map(ms => { const n = nC + Math.round(ms / 1000 / h), r = rec(o, n), tw = rec(runs.TWIN, n), ST = r.S.slice(NB, 2 * NB), SR = r.S.slice(0, NB), STw = tw.S.slice(0, NB);
    const bT = sole(ST, "R"), bR = sole(SR, "R"), vT = vAt(ST[bi("foot_R")], bT), vR = r.recipientActive ? vAt(SR[bi("foot_R")], bR) : null, vRt = tw.recipientActive ? vAt(STw[bi("foot_R")], sole(STw, "R")) : null;
    return { ms, tacklingBootV: decT(vT), tacklingBootSpeed: r3(V.len(vT)), tacklingBootHeight: r3(bT[1]), struckFootV: vR ? decR(vR) : null, struckFootVTwin: vRt ? decR(vRt) : null, bootToStruckFootM: r3(Math.hypot(bT[0] - bR[0], bT[2] - bR[2])),
      loads: loads(r), loadsTwin: loads(tw), recipientComV: r.recipientActive ? decR(V.sc(r.chars.runner.P, 1 / L.M)) : null, recipientComVTwin: tw.recipientActive ? decR(V.sc(tw.chars.runner.P, 1 / L.M)) : null, tacklerComV: decT(V.sc(r.chars.tackler.P, 1 / L.M)) }; });
  out[k] = R; console.log(k, "first", JSON.stringify(R.first.contacts.map(c => [c.tackler, c.recipient, c.normalN])), "pairs", R.log.map(e => `${e.pair} ${e.firstMs}…${e.lastMs} ms pk ${e.peakN} N`).join(" | ")); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
