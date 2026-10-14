// PVP-1 driver: the frozen setup (pvp1_setup.mjs) → for each condition, the recipient's TWIN, PVP-F2 and PVP-F3, each from the identical recipient
// handoff state; one clock-alignment iteration on the measured first contact (the mean of F2 and F3).
// usage (worktree root): node pvp1_run.mjs --conds CANON,EARLY,LATE,LIGHT,STRONG --out <dir> [--steps 720]
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs");
const SU = await import(new URL("./pvp1_setup.mjs", import.meta.url).href), W = await import(new URL("./pvp1_world.mjs", import.meta.url).href), REC = await import(new URL("./pvp1_recipient.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const firstCross = (o) => { for (const r of o.recs) { const cs = r.contacts.filter(c => c.kind === "cross" && c.Jn > 0); if (cs.length) return { t: r.t, n: Math.round(r.t / SU.H), pairs: cs.map(c => [c.a[1], c.b[1]]) }; } return null; };
export async function references() { const f2 = await SU.soloRef("F2"), f3 = await SU.soloRef("F3"), target = [(f2.boot[0] + f3.boot[0]) / 2, 0, (f2.boot[2] + f3.boot[2]) / 2], tb = (f2.tb + f3.tb) / 2;
  return { f2: { firstBodyT: f2.firstBodyT, tb: f2.tb, boot: f2.boot }, f3: { firstBodyT: f3.firstBodyT, tb: f3.tb, boot: f3.boot }, target, tb, bootTraj: { F2: f2.bootTraj, F3: f3.bootTraj } }; }
export async function runCond(cond, ref, steps, outDir, log = console.log) { const run = REC.loadRun(SU.RUNIN_R);
  let tFC = ref.tb - 0.04, R = SU.recipientFor(cond, ref.target, tFC, run), res = null;
  for (let it = 0; it < 2; it++) { const o2 = await W.runPVP({ kind: "F2", runinT: SU.RUNIN_T, R, steps }), o3 = await W.runPVP({ kind: "F3", runinT: SU.RUNIN_T, R, steps }), c2 = firstCross(o2), c3 = firstCross(o3);
    log(cond, "iter", it, "actR", R.actR, "kH", R.kH, "kC", R.kC, "first contact F2", c2 && c2.t.toFixed(4), JSON.stringify(c2 && c2.pairs), "F3", c3 && c3.t.toFixed(4), JSON.stringify(c3 && c3.pairs));
    res = { o2, o3, c2, c3 }; if (!c2 || !c3) break; const tm = (c2.t + c3.t) / 2; if (it === 0 && Math.abs(tm - tFC) > 0.6 * SU.H) { tFC = tm; R = SU.recipientFor(cond, ref.target, tFC, run); continue; } break; }
  const tw = await W.runPVP({ kind: "F3", runinT: SU.RUNIN_T, R, steps, twin: true }), meta = { cond, C: R.C, kC: R.kC, kH: R.kH, kTD: R.kTD, stanceN: R.stanceN, actR: R.actR, tFC: R.tFC, offR: R.offR, qR: R.qR, psi: SU.PSI, target: ref.target, soleWorld: R.soleWorld,
    firstContact: { F2: res.c2, F3: res.c3 }, hashes: { F2: res.o2.finalHash, F3: res.o3.finalHash, TWIN: tw.finalHash }, recipientOpts: R.opts };
  // the recipient's RUN-1 presentation before its takeover (world frame) and its RUN-1 continuation after it (comparison only)
  const F = run.F, pres = []; for (let k = R.kH - R.actR - 30; k <= R.kH + Math.round(2.6 / SU.H) && k < F.length; k++) { const t = (k - R.kH) * SU.H + R.actR * SU.H; pres.push({ t: +t.toFixed(5), k, S: W.placePose(R.H.SA(k), R.qR, R.offR).map(s => ({ pos: s.pos, rot: s.rot })), stance: F[k].stance }); }
  for (const [lab, o] of [["F2", res.o2], ["F3", res.o3], ["TWIN", tw]]) { o.meta = meta; o.run1R = pres; L.writeGz(`${outDir}/${cond}_${lab}.json.gz`, o); }
  return meta; }
if (process.argv[1] && process.argv[1].endsWith("pvp1_run.mjs")) { const out = arg("out"), steps = +arg("steps", "720"); fs.mkdirSync(out, { recursive: true });
  const ref = await references(); console.log("reference: F2 firstBody", ref.f2.firstBodyT, "tb", ref.f2.tb.toFixed(4), "boot", ref.f2.boot.map(x => x.toFixed(3)), "| F3 firstBody", ref.f3.firstBodyT, "tb", ref.f3.tb.toFixed(4), "boot", ref.f3.boot.map(x => x.toFixed(3)), "| target", ref.target.map(x => x.toFixed(3)), "tb", ref.tb.toFixed(4));
  fs.writeFileSync(`${out}/reference.json`, JSON.stringify(ref)); const metas = {};
  for (const c of arg("conds", "CANON").split(",")) metas[c] = await runCond(c, ref, steps, out);
  fs.writeFileSync(`${out}/meta_${arg("conds", "CANON").replace(/,/g, "_")}.json`, JSON.stringify(metas, null, 1)); }
