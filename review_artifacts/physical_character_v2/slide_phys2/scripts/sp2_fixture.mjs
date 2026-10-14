// SLIDE-PHYS-2 Phase 2 — isolated bent-leg slide fixture. The V2 tackler (gabriel proportions, V2 mass / inertia, M1c actuation on the tackler
// as in SP1, TCF-1 on the boots) starts AIRBORNE just above the turf in a committed low posture, every body moving with one rigid-body velocity
// (a physically valid state: uniform translation, no spin; the lowest point 0.5 mm above the turf), and from then on only gravity, contacts and
// its own finite muscle torques act — no root propulsion, no velocity writes after the single activation write, no hidden impulse.
// A fixture = { id, entry: { anat, pelvis, vRoot }, tracks (choreography, anatomical deg, t from touchdown), couple?, gains?, authority?, rmat? }.
// usage (worktree root): node sp2_fixture.mjs --fx <name> [--steps 360] [--out rec.json.gz] [--vz 4.8 --vy -1.0]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href;
const L = await import(S1 + "sp_lib.mjs"), RUN = await import(S1 + "sp_run.mjs"), C = await import(S1 + "sp_chor.mjs"), CT = await import(S1 + "sp_ctrl.mjs"), CL = await import(S1 + "sp_climits.mjs");
const M = await import(new URL("./sp2_measures.mjs", import.meta.url).href), FX = await import(new URL("./sp2_fixtures_def.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const GAINS = { default: { f: 3, zeta: 0.9 }, hip: { f: 3.5, zeta: 0.9 }, knee: { f: 3.5, zeta: 0.9 }, ankle: { f: 3, zeta: 0.9 }, neck: { f: 2.5, zeta: 0.9 } };
export const FF = [{ chain: ["hip_R", "knee_R", "ankle_R"] }, { chain: ["hip_L", "knee_L", "ankle_L"] }, { chain: ["shoulder_L", "elbow_L"] }, { chain: ["shoulder_R", "elbow_R"] }];
// a fixture → a SLIDE-PHYS-1-compatible candidate (runCand): SlideTracker on the choreography, gravity / inertia feed-forward chains, M1c, TCF-1
export function toCand(fx, opts = {}) { const vRoot = [fx.entry.vRoot[0], opts.vy ?? fx.entry.vRoot[1], opts.vz ?? fx.entry.vRoot[2]];
  const entry = { id: fx.id, anat: fx.entry.anat, rate: fx.entry.rate || {}, pelvis: fx.entry.pelvis, pelvisW: fx.entry.pelvisW || [0, 0, 0], vRoot };
  const chor = { name: fx.id, tracks: fx.tracks }, ff = (fx.ff ?? FF).map(f => ({ ...f, weight: f.weight || (() => 1) }));
  const cand = { id: fx.id, entry, chor, steps: opts.steps || fx.steps || 360, lead: fx.lead ?? 0.06, ffLead: fx.ffLead ?? 0.1, gains: fx.gains || GAINS, muscle: fx.muscle ?? "M1c", soleRule: fx.soleRule ?? { studded: 1.2, upper: 0.5 },
    authority: fx.authority || (() => 1), yield: fx.yield || null, ragdoll: fx.ragdoll || null, couple: fx.couple || null, ff };
  cand.makeCtrl = (c, ch) => new CT.SlideTracker({ chor: ch, lead: c.lead, ffLead: c.ffLead, gains: c.gains, authority: c.authority, yield: c.yield, ragdoll: c.ragdoll, ff: c.ff, couple: c.couple, vf: fx.vf ? fx.vf(c, ch) : null, vfs: fx.vfs ? fx.vfs(c, ch) : null });
  return cand; }
export async function runFixture(fx, opts = {}) { const cand = toCand(fx, opts), o = await CL.auditRun(cand, { steps: cand.steps, setup: opts.setup });
  o.fixture = { id: fx.id, entry: cand.entry, note: fx.note || "" }; o.contactRule = cand.soleRule; return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2_fixture.mjs")) { const fx = FX.FIXTURES[arg("fx")]; if (!fx) throw new Error("no fixture " + arg("fx") + "; have " + Object.keys(FX.FIXTURES));
  const o = await runFixture(fx, { steps: +arg("steps", "360"), vz: arg("vz") ? +arg("vz") : undefined, vy: arg("vy") ? +arg("vy") : undefined }); const m = M.measure(o);
  if (arg("out")) L.writeGz(arg("out"), o); const cl = CL.cTable(o.climits, 1.0);
  console.log(fx.id, o.finalHash, M.brief(m)); console.log("   limits:", cl.map(e => `${e.id} ${e.beyond}°/${(e.dur * 1000).toFixed(0)}ms@${e.at}`).join(", ") || "none > 1°", "| entry lowest:", o.entry.lowestBody); }
