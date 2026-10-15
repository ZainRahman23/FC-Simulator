// HYBRID-RUN-1 sensitivity check (NOT adopted; every frozen run has acCut = null): how much does the hybrid runner depend on the
// ANIMATION-CONSISTENCY pelvis moment (hr_runner.mjs §2 BALANCE: the bounded external moment that follows RUN-1's pelvis orientation beyond what
// the foot support can give, logged as Tac)?
//   1. its usage in the frozen runs: |Tac| over the first second after the first player contact (NC / TWIN: the same window), and its angular
//      impulse, next to the supported part (Tsup);
//   2. the no-contact runner with Tac removed at a fixed time (0.358 / 0.5 / 0.9 s: the STRONG, PVP and BRUSH contact times), contact or not;
//   3. every contact scene with Tac removed from the first sensed player contact on (acCut "touch").
// usage (worktree root): node hr_sens_ac.mjs --runs <frozen runs dir> --tmp <dir for the variant records> --out <json>
import fs from "fs";
const H = new URL("./", import.meta.url).href, HS = await import(H + "hr_scenes.mjs"), HW = await import(H + "hr_world.mjs"), L = await import(H + "../../slide_phys1/scripts/sp_lib.mjs");
const arg = (k) => process.argv[process.argv.indexOf("--" + k) + 1], runs = arg("runs"), tmp = arg("tmp"), steps = 720, h = 1 / 240; fs.mkdirSync(tmp, { recursive: true });
const r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
const fallOf = (o, role) => { for (const r of o.recs) for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && !/^foot_/.test(x[1])) return { t: r3(r.t), body: x[1] }; } return null; };
const firstN = (o) => { for (const r of o.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) return Math.round(r.t / h); return null; };
const usage = (log, n0) => { const rows = (log || []).filter(x => x && x.n >= n0 && x.n < n0 + 240), m = (k) => rows.map(x => Math.hypot(...(x[k] || [0, 0, 0])));
  const ac = m("Tac"), su = m("Tsup"); return { animationNm: { mean: Math.round(ac.reduce((a, b) => a + b, 0) / ac.length), max: Math.round(Math.max(...ac)), angularImpulseNms: r3(ac.reduce((a, b) => a + b, 0) * h) },
    supportedNm: { mean: Math.round(su.reduce((a, b) => a + b, 0) / su.length), max: Math.round(Math.max(...su)), angularImpulseNms: r3(su.reduce((a, b) => a + b, 0) * h) } }; };
const out = { note: "sensitivity check only: the animation-consistency pelvis moment (Tac); nothing here is adopted", usageFirstSecond: {}, noContactCut: [], contactCut: {} };
// 1
for (const k of ["NC", "PVP_TWIN", "SH_BRUSH", "SH_BUMP", "SH_STRONG", "PVP_F2", "PVP_F3"]) { const o = L.readGz(`${runs}/${k}.json.gz`), n0 = firstN(o) ?? 120;
  out.usageFirstSecond[k] = { fromStep: n0, runner: usage(o.lawR, n0), second: o.lawT ? usage(o.lawT, n0) : null }; }
// 2
for (const tc of [0.358, 0.5, 0.9]) { const o = await HW.runHybrid({ intent: HS.intentNC(steps), opts: { support: { acCut: tc } }, steps }), f = fallOf(o, "runner");
  out.noContactCut.push({ cutAtS: tc, hash: o.finalHash, fall: f, fallAfterCutS: f ? r3(f.t - tc) : null }); }
// 3
const opts = { support: { acCut: "touch" } };
for (const nm of ["SH_BRUSH", "SH_BUMP", "SH_STRONG", "PVP_F2", "PVP_F3"]) { let o;
  if (nm.startsWith("SH_")) { const I = HS.intentsSH(nm.slice(3), steps); o = await HW.runHybrid({ intent: I.A, opts, second: { kind: "hybrid", intent: I.B, opts }, steps }); o.scene = { name: nm, theta: I.theta, tc: I.tc, dc: I.dc, d0: I.d0, offRB: I.offR }; }
  else { const I = HS.intentPVP(steps); o = await HW.runHybrid({ intent: I, opts, second: { kind: nm.slice(4), runinT: HS.RUNIN_T }, steps }); }
  L.writeGz(`${tmp}/${nm}.json.gz`, o); const fr = L.readGz(`${runs}/${nm}.json.gz`), n0 = firstN(o), t0 = n0 * h, fA = fallOf(o, "runner"), fAf = fallOf(fr, "runner"), two = nm.startsWith("SH_");
  out.contactCut[nm] = { hash: o.finalHash, firstContactS: r3(t0), runner: { fallCut: fA, fallCutAfterContactS: fA ? r3(fA.t - t0) : null, fallFrozen: fAf, fallFrozenAfterContactS: fAf ? r3(fAf.t - t0) : null },
    second: two ? { fallCut: fallOf(o, "tackler"), fallFrozen: fallOf(fr, "tackler") } : null }; }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
