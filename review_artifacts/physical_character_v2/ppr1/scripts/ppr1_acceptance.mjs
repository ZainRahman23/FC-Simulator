// PPR-1 implementation acceptance (preregistration §4.6), BEFORE any validation or PVP run with B:
//   1. B's runtime entry values (τ_drive, a±, K_i, D_i) reproduce evidence/PPR1_DESIGN_TABLE.json to ≤ 1e-9 relative; H7's entry magnitudes;
//   2. law A through the plant still reproduces PVP-1A-DX N2 e5751b0cbdd7c2b9 and C0 bc24da7b20eaf828;
//   3. B SOLO (no tackler), 24 steps: finite, two runs bit-identical.
// usage: V2_KNEE_MODEL=v2k node ppr1_acceptance.mjs --fixture <PVP1A_FIXTURE.json> --out <json>
import fs from "fs";
const { runOne } = await import(new URL("./ppr1_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), T = JSON.parse(fs.readFileSync(new URL("../evidence/PPR1_DESIGN_TABLE.json", import.meta.url))), out = { tool: "ppr1_acceptance.mjs" };
// 1 · entry values
const b0 = await runOne({ fixtureObj: FIX, law: "B", scene: "SOLO", steps: 0 }), E = b0.entry.law0, rel = (a, b) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
let worst = { rel: 0 }; for (const r of T.rows) { const e = E.find(x => x.k === r.k && x.i === r.i); if (!e) { worst = { rel: Infinity, missing: r.joint + "." + r.axis }; break; }
  for (const [a, b, nm] of [[e.drive, r.tauDrive, "drive"], [e.aP, r.aP, "aP"], [e.aM, r.aM, "aM"], [e.Ki, r.Ki, "Ki"], [e.Di, Math.max(0.02, r.Di), "Di"]]) { const v = Math.abs(b) < 1e-12 ? Math.abs(a - b) : rel(a, b); if (v > worst.rel) worst = { rel: v, at: r.joint + "." + r.axis + " " + nm, runtime: a, table: b }; } }
const ank = E.filter(x => /^ankle_/.test(x.joint) && T.rows.find(r => r.k === x.k && r.i === x.i).axis === "df"), lum = E.find(x => x.joint === "lumbar" && T.rows.find(r => r.k === x.k && r.i === x.i).axis === "flex");
out.entry = { worstRel: worst, pass: worst.rel <= 1e-9, H7: { ankleSagittalSumKiOverMgh: ank.reduce((s, x) => s + x.Ki, 0) / T.entry.mgh, ankleDi: ank.map(x => x.Di), lumbarFlexKi: lum.Ki } };
out.entry.H7.pass = out.entry.H7.ankleSagittalSumKiOverMgh >= 0.64 && out.entry.H7.ankleSagittalSumKiOverMgh <= 0.94 && ank.every(x => x.Di >= 0.5 && x.Di <= 2.0) && lum.Ki >= 109 && lum.Ki <= 180;
// 2 · A unchanged
const aN2 = await runOne({ fixtureObj: FIX, law: "A", scene: "N2" }), aC0 = await runOne({ fixtureObj: FIX, law: "A", scene: "C0" });
out.A = { N2: aN2.finalHash, C0: aC0.finalHash, pass: aN2.finalHash === "e5751b0cbdd7c2b9" && aC0.finalHash === "bc24da7b20eaf828" };
// 3 · B SOLO smoke
const s1 = await runOne({ fixtureObj: FIX, law: "B", scene: "SOLO", steps: 24 }), s2 = await runOne({ fixtureObj: FIX, law: "B", scene: "SOLO", steps: 24 });
const fin = s1.recs.every(r => r.S.every(b => [...b.pos, ...b.rot, ...b.v, ...b.w].every(Number.isFinite)));
out.Bsmoke = { steps: s1.recs.length, finite: fin, h1: s1.finalHash, h2: s2.finalHash, stop: s1.stop || null, pass: fin && s1.finalHash === s2.finalHash && !s1.stop && s1.recs.length === 24 };
out.pass = out.entry.pass && out.entry.H7.pass && out.A.pass && out.Bsmoke.pass; fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
