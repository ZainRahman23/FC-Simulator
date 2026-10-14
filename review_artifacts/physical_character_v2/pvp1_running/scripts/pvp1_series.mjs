// PVP-1 plot series (reads records; nothing is simulated): every 1/60 s from −0.3 s to +1.5 s around the first player–player contact, per
// condition, for PVP-F2, PVP-F3, the TWIN and the two tacklers' solo runs (the same clock).
//   recipient (recipient heading frame: fwd = its running direction, left = its left): struck (right) and far (left) sole-centre displacement
//     from the first contact, per-foot turf load (BW), COM velocity, pelvis height, trunk tilt from vertical;
//   tackler: horizontal COM speed, pelvis height, thorax tilt, whole-body joint RMS vs its solo run.
// usage (worktree root): node pvp1_series.mjs --runs <dir> --solo2 <rec> --solo3 <rec> --out <series.json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, B, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const h = 1 / 240, BW = L.M * 9.81, D = 180 / Math.PI, NB = B.length, r3 = (x) => Math.round(x * 1000) / 1000;
const sole = (S, s) => { const f = S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); }, tilt = (q) => Math.acos(Math.max(-1, Math.min(1, Q.rot(q, [0, 1, 0])[1]))) * D;
const at = (o, t) => o.recs[Math.max(0, Math.min(o.recs.length - 1, Math.round(t / h) - 1))];
const load = (r, role, b) => { let s = 0; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && x[1] === b) s += c.Jn / h / BW; } return s; };
const first = (o) => { for (const r of o.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) return r.t; return null; };
const solo = { F2: L.readGz(arg("solo2")), F3: L.readGz(arg("solo3")) }, out = { cols: {}, conds: {} };
out.cols.rec = ["t", "struckFwd", "struckLeft", "struckUp", "farFwd", "farLeft", "farUp", "loadR", "loadL", "vFwd", "vLeft", "vUp", "pelvisY", "trunkTilt"];
out.cols.tack = ["t", "vh", "vhSolo", "pelvisY", "pelvisYSolo", "thoraxTilt", "thoraxTiltSolo", "jointRmsVsSolo"];
for (const cond of arg("conds", "CANON,EARLY,LATE,LIGHT,STRONG").split(",")) { const R = {}; for (const k of ["F2", "F3", "TWIN"]) R[k] = L.readGz(`${arg("runs")}/${cond}_${k}.json.gz`);
  const meta = R.TWIN.meta, qR = meta.qR, fwd = Q.rot(qR, [0, 0, 1]), left = Q.rot(qR, [1, 0, 0]), t0s = { F2: first(R.F2), F3: first(R.F3) }; t0s.TWIN = (t0s.F2 + t0s.F3) / 2;
  const C = { t0: t0s, rec: {}, tack: {} };
  for (const k of ["F2", "F3", "TWIN"]) { const o = R[k], t0 = t0s[k], S0 = at(o, t0).S.slice(0, NB), rows = [];
    for (let dt = -0.3; dt <= 1.5 + 1e-9; dt += 1 / 60) { const r = at(o, t0 + dt), S = r.S.slice(0, NB), P = V.sc(r.chars.runner.P, 1 / L.M), ds = V.sub(sole(S, "R"), sole(S0, "R")), df = V.sub(sole(S, "L"), sole(S0, "L")), act = r.recipientActive;
      rows.push([r3(dt), r3(V.dot(ds, fwd)), r3(V.dot(ds, left)), r3(ds[1]), r3(V.dot(df, fwd)), r3(V.dot(df, left)), r3(df[1]), act ? r3(load(r, "runner", "foot_R")) : null, act ? r3(load(r, "runner", "foot_L")) : null,
        act ? r3(V.dot(P, fwd)) : null, act ? r3(V.dot(P, left)) : null, act ? r3(P[1]) : null, r3(S[0].pos[1]), r3(tilt(S[bi("thorax")].rot))]); }
    C.rec[k] = rows;
    if (k === "TWIN") continue; const so = solo[k], rowsT = [];
    for (let dt = -0.3; dt <= 1.5 + 1e-9; dt += 1 / 60) { const t = t0 + dt, r = at(o, t), rs = at(so, t), S = r.S.slice(NB, 2 * NB), Ss = rs.S.slice(0, NB), P = r.chars.tackler.P, Ps = rs.chars.tackler.P;
      const aa = L.anatOf(S.map(s => ({ pos: s.pos, rot: s.rot }))), ab = L.anatOf(Ss), dj = []; for (const j of Object.keys(ab)) for (const q of Object.keys(ab[j])) dj.push(aa[j][q] - ab[j][q]);
      rowsT.push([r3(dt), r3(Math.hypot(P[0], P[2]) / L.M), r3(Math.hypot(Ps[0], Ps[2]) / L.M), r3(S[0].pos[1]), r3(Ss[0].pos[1]), r3(tilt(S[bi("thorax")].rot)), r3(tilt(Ss[bi("thorax")].rot)), r3(Math.sqrt(dj.reduce((s, x) => s + x * x, 0) / dj.length))]); }
    C.tack[k] = rowsT; }
  out.conds[cond] = C; console.log(cond, "series", JSON.stringify(t0s)); }
fs.writeFileSync(arg("out"), JSON.stringify(out));
