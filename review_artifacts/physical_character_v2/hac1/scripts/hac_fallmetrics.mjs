// V1 vs candidate fall metrics (HAC1_LOG §11): commitment step, first non-foot ground contact, COM height / speed at commitment, travel, knees.
// usage (worktree root): node hac_fallmetrics.mjs '<opts JSON>' PUSH_STRONG,PVP_F3,...
const RA = process.cwd() + "/review_artifacts/physical_character_v2/";
const SC = await import(RA + "hac1/scripts/hac_scenes.mjs"), T = await import(RA + "hac1/scripts/hac_test.mjs"), L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, bi } = L;
const opts = JSON.parse(process.argv[2] || "{}"), h = 1 / 240;
const first = (o) => { for (const r of o.recs) for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === "runner" && !/^foot_/.test(x[1])) return { n: Math.round(r.t / h), body: x[1] }; } return null; };
const ang = (S, a, b) => { const qa = S[bi(a)].rot, qb = S[bi(b)].rot, d = Q.mul(Q.conj(qa), qb); return 2 * Math.acos(Math.min(1, Math.abs(d[3]))) * 57.3; };
for (const nm of process.argv[3].split(",")) { const o = await SC.runScene(nm, 783, opts), oc = T.outcome(o), f = first(o);
  if (!f) { console.log(nm.padEnd(16), "no fall", "Vmin", oc.vMinA); continue; }
  const nc = oc.commitA ?? f.n, S = (n) => o.recs[n - 1].S.slice(0, 14), vh = (n) => { const v = V.sc(o.recs[n - 1].chars.runner.P, 1 / L.M); return Math.hypot(v[0], v[2]); }, c0 = L.comOf(S(nc)), c1 = L.comOf(S(f.n));
  const up = Q.rot(S(f.n)[bi("thorax")] ? S(f.n)[bi("thorax")].rot : S(f.n)[0].rot, [0, 1, 0]), tilt = Math.acos(up[1]) * 57.3;
  // 2 / 4 / 6 / 8 tenths after commit: COM height and horizontal speed
  const ser = [0.1, 0.2, 0.3, 0.4, 0.5].map(dt => { const n = nc + Math.round(dt / h); if (n > o.recs.length) return "-"; return L.comOf(S(n))[1].toFixed(2) + "@" + vh(n).toFixed(1); }).join(" ");
  console.log(nm.padEnd(16), "commit", nc, "ground", f.n, f.body.padEnd(10), "dt", ((f.n - nc) * h).toFixed(2), "travel", Math.hypot(c1[0] - c0[0], c1[2] - c0[2]).toFixed(2), "v@commit", vh(nc).toFixed(1), "v@ground", vh(f.n).toFixed(1), "comY", c0[1].toFixed(2) + "→" + c1[1].toFixed(2), "tilt", tilt.toFixed(0), "kneeL/R", ang(S(f.n), "thigh_L", "shank_L").toFixed(0) + "/" + ang(S(f.n), "thigh_R", "shank_R").toFixed(0), "| y@v +.1..+.5", ser); }
