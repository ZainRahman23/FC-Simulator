// SP2C — WHY does every SP2A / FSWEEP condition roll face-down late? Single-factor ablations of SP2A (evidence/SP2A_opts.json, unchanged) at the
// temporary friction F37.5, on the 3 run-ins, 6 s. Each factor the brief names is changed ALONE on a copy of SP2A's candidate:
//   authority   regional authority after contact held at 1.0 instead of SP2A's A7 decay (0.35–0.6)
//   armLimp     fold-side + tackling-side arm authority 0.15 after contact (does SP2A's posted arm do anything?)
//   armWide     fold-side arm posted wide / lateral beside the hip (shoulder flex −20, abd 75, elbow 10) instead of behind
//   foldTuck    SP2C's compact folded-leg geometry (knee under / inside the hip; sp2c_cand TUCK_C) from the push-off, held
//   trunkMore   trunk counter-lean toward the tackling side doubled (lumbar.lat 16 → 30, thoracic.lat 8 → 15)
//   trunkNone   no counter-lean (lumbar / thoracic lat 0)
//   tackLow     tackling leg kept low after the strike (hip flexion 72 → 45 from 0.8 s)
//   seatStrong  seat objective (pelvis orientation through the fold hip) ko 97 → 400 and held to 6 s
//   seatOff     no seat objective
//   neckUp      head held forward-up (neck flex 18 → 32)
//   tracksHeld  SP2A's targets / seat / authority all held to 6 s (the timeline end at 1.7 s removed)
// For each: time first prone, min belly-down, the roll ledger (contact angular impulse about the travel axis over [first fold contact, +2 s]),
// slide path, final state. usage (worktree root): node sp2c_rollover.mjs [--out evidence.json]
import fs from "fs";
const B0 = new URL("../../", import.meta.url).href, FL = await import(B0 + "sp2a/scripts/sp2a_flight.mjs"), AA = await import(B0 + "sp2a/scripts/sp2a_author.mjs"), CL = await import(B0 + "slide_phys1/scripts/sp_climits.mjs");
const FC = await import(B0 + "sp2a/fsweep/scripts/fs_contact.mjs"), DG = await import(new URL("./sp2c_diag.mjs", import.meta.url).href), SC = await import(new URL("./sp2c_cand.mjs", import.meta.url).href), RC = await import(new URL("./sp2c_run.mjs", import.meta.url).href);
const A = JSON.parse(fs.readFileSync(new URL("../../sp2a/evidence/SP2A_opts.json", import.meta.url))), M = RC.TEMP_M;
const setKeys = (tr, k, keys) => { tr[k] = keys; }, keepTo = (tr, k, t1) => (tr[k] || [[0, 0]]).filter(([t]) => t <= t1);
const holdAuth = (c, v) => { c.contactAuth = { ...c.contactAuth, schedule: [[0, { tackLeg: 1, trailLeg: 1, trunk: 1, armL: 1, armR: 1 }], [0.06, v], [9, v]] }; };
export const FACTORS = {
  baseline: () => {},
  authority: (c) => holdAuth(c, { tackLeg: 1, trailLeg: 1, trunk: 1, armL: 1, armR: 1 }),
  armLimp: (c) => { const s = c.contactAuth.schedule.map(([t, v]) => [t, t > 0 ? { ...v, armL: 0.15, armR: 0.15 } : v]); c.contactAuth = { ...c.contactAuth, schedule: s }; },
  armWide: (c) => { const tr = c.chor.tracks; for (const [k, x] of [["shoulder_L.flex", -20], ["shoulder_L.abd", 75], ["elbow_L.flex", 10]]) setKeys(tr, k, [...keepTo(tr, k, 0.12), [0.4, x], [6, x]]); },
  foldTuck: (c) => { const tr = c.chor.tracks, tk = SC.TUCK_C, T = 0.28;
    setKeys(tr, "hip_L.flex", [...keepTo(tr, "hip_L.flex", 0.1), [T, tk.hipFlex], [6, tk.hipFlex]]); setKeys(tr, "hip_L.abd", [...keepTo(tr, "hip_L.abd", 0.08), [T, tk.hipAbd], [6, tk.hipAbd]]);
    setKeys(tr, "hip_L.rot", [...keepTo(tr, "hip_L.rot", 0.08), [T, tk.hipRot], [6, tk.hipRot]]); setKeys(tr, "knee_L.flex", [...keepTo(tr, "knee_L.flex", 0.2), [T, tk.knee], [6, tk.knee]]);
    setKeys(tr, "ankle_L.df", [...keepTo(tr, "ankle_L.df", 0.1), [T, tk.ankDf], [6, tk.ankDf]]); setKeys(tr, "ankle_L.inv", [...keepTo(tr, "ankle_L.inv", 0.11), [T, tk.ankInv], [6, tk.ankInv]]); },
  trunkMore: (c) => { const tr = c.chor.tracks; setKeys(tr, "lumbar.lat", [[0, 0], [0.12, 8], [0.3, 30], [6, 30]]); setKeys(tr, "thoracic.lat", [[0, 0], [0.3, 15], [6, 15]]); },
  trunkNone: (c) => { const tr = c.chor.tracks; setKeys(tr, "lumbar.lat", [[0, 0], [6, 0]]); setKeys(tr, "thoracic.lat", [[0, 0], [6, 0]]); },
  tackLow: (c) => { const tr = c.chor.tracks; setKeys(tr, "hip_R.flex", [...keepTo(tr, "hip_R.flex", 0.8), [1.1, 45], [6, 45]]); },
  seatStrong: (c) => { c.seat = { ...c.seat, window: [0.3, 6], gains: { ko: 400, do: 56 }, pelvis: { pitch: [...c.seat.pelvis.pitch, [6, c.seat.pelvis.pitch.at(-1)[1]]], roll: [...c.seat.pelvis.roll, [6, c.seat.pelvis.roll.at(-1)[1]]], yaw: [[0, 0], [6, 0]] } }; },
  seatOff: (c) => { delete c.seat; },
  neckUp: (c) => { const tr = c.chor.tracks; setKeys(tr, "neck.flex", [[0, -6], [0.25, 10], [0.5, 32], [6, 32]]); },
  tracksHeld: (c) => { for (const k of Object.keys(c.chor.tracks)) { const t = c.chor.tracks[k]; t.push([6, t.at(-1)[1]]); } if (c.seat) c.seat = { ...c.seat, window: [c.seat.window[0], 6], pelvis: Object.fromEntries(Object.entries(c.seat.pelvis).map(([k, v]) => [k, [...v, [6, v.at(-1)[1]]]])) }; },
};
export async function runFactor(runin, name, m = M, steps = 1440) { const RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = FL.tackleCand(speed, A); FACTORS[name](cand);
  const plan = FL.flightPlan(RI, cand), c2 = { ...cand, entry: plan.entry, id: "SP2A·" + name }, o = await CL.auditRun(c2, { steps, setup: FC.sweepSetup(m) }); o.tOffset = 0; o.candId = c2.id; o.runIn = plan.frames; o.speedTackler = speed; return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2c_rollover.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const S = arg("runins").split(","), names = (arg("only") || Object.keys(FACTORS).join(",")).split(","), out = {};
  for (const nm of names) { out[nm] = []; for (const ri of S) { const o = await runFactor(ri, nm), d = DG.diagnose(o, M), top = Object.entries(d.rollLedger2s).slice(0, 4);
    const r = { runin: ri.split("/").pop(), hash: o.finalHash, proneT: d.proneT, firstFoldContactT: d.firstFoldContactT, slide: d.sweepMeasures.slidePathM, final: d.sweepMeasures.finalState.class, headTurfT: d.sweepMeasures.finalState.headTurfT, rollLedger: d.rollLedger2s,
      at500: d.milestones["+500ms"] && { pelvisRoll: d.milestones["+500ms"].pelvis.roll, bellyDownY: d.milestones["+500ms"].trunk.bellyDownY, Lroll: d.milestones["+500ms"].angMomRoll }, at1s: d.milestones["+1.0s"] && { pelvisRoll: d.milestones["+1.0s"].pelvis.roll, bellyDownY: d.milestones["+1.0s"].trunk.bellyDownY, Lroll: d.milestones["+1.0s"].angMomRoll } };
    out[nm].push(r); console.log(nm.padEnd(11), r.runin.padEnd(18), "prone", String(r.proneT).padEnd(6), "slide", r.slide, r.final.padEnd(18), "| +0.5 s roll", r.at500 && r.at500.pelvisRoll, "L", r.at500 && r.at500.Lroll, "| +1 s roll", r.at1s && r.at1s.pelvisRoll, "| ledger", JSON.stringify(Object.fromEntries(top))); } }
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ tool: "sp2c_rollover.mjs", friction: "F37.5 temporary", base: "SP2A_opts.json (unchanged)", factors: out }, null, 1)); }
