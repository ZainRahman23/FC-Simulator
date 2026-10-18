// dribble15/tools/d15_leadsweep.mjs — THE KNOWN EARLY-RELEASE CASE (the owner's DRIBBLE-1.4 §3): one scenario × seed with the held cut released a
// chosen number of ticks after the request (the release search run to completion at once — diagnostic only — so every release tick is evaluated
// exactly): the stage / cut touch it produces (tick, foot, surface, planned and executed speed, the execution-error draws keyed by its tick), the
// next touches, the outcome; with the release search's candidate contacts every 3 ticks from the release (DRIBBLE-1.2 / 1.3) or every tick
// usage: node d15_leadsweep.mjs [ID CUT90_RUN] [seed 16] [out.json]
import fs from "fs"; import { makeSim, D1, PROFILES } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d15_quality.mjs";
const [id = "CUT90_RUN", sdA = "16", outFile] = process.argv.slice(2), scn = get(id), rows = [];
const base = { ...D1.plan13 }, b14 = { ...D1.plan14 }, s14 = { ...D1.setup14 };
for (const rStep of [0, 1]) for (let L = 1; L <= 24; L++) {
  Object.assign(D1.plan13, base, { rSync: true, lead: L }); Object.assign(D1.plan14, b14, { rStep, retime: false }); Object.assign(D1.setup14, s14, { graded: false });
  const S = makeSim(scn, { ver: "d15", seed: +sdA, player: PROFILES.HIGH, opts: { record: true } }); S.run(); const q = cutQuality(S, scn);
  const st = S.touches.find((t) => t.launched && t.release), after = S.touches.filter((t) => t.launched && st && t.k > st.k).slice(0, 2);
  rows.push({ rStep: rStep || 3, lead: L, releaseTick: (S.turnLog.find((e) => e.kind === "stage" || e.kind === "release") || {}).k ?? null,
    stage: st ? { k: st.k, F: st.F, reg: st.reg, role: st.role, planned: +st.desired.speed.toFixed(2), executed: +st.executed.speed.toFixed(2), errDraw: st.error ? [st.error.eS, st.error.eD, st.error.eL].map((x) => +x.toFixed(3)) : null } : null,
    next: after.map((t) => ({ k: t.k, F: t.F, reg: t.reg, role: t.role, speed: +t.executed.speed.toFixed(2) })), outcome: q.taken ? (q.takenCleanly ? "clean" : "taken") : "lost", ball20: q.toBall20S });
  const r = rows[rows.length - 1]; console.log(`step ${r.rStep} lead ${String(L).padStart(2)} release ${r.releaseTick} | stage ${r.stage ? `${r.stage.k} ${r.stage.F} ${r.stage.reg} ${r.stage.planned}→${r.stage.executed} draw ${r.stage.errDraw[0]}` : "-"} | next ${r.next.map((t) => t.k + t.F + t.reg[0] + "/" + t.role).join(" ")} | ${r.outcome}`);
}
Object.assign(D1.plan13, base); Object.assign(D1.plan14, b14); Object.assign(D1.setup14, s14);
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ id, seed: +sdA, rows }, null, 1));
