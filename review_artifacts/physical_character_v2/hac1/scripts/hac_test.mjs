// HAC-1 deterministic regression battery.
//   node hac_test.mjs --expect <json> [--write] [--runs <dir>] [--only A,B]
// Every scene runs TWICE in this process: the two final state-hash chains must match (determinism). Each scene's outcome is then compared with the
// stored expectation (evidence/HAC1_expectations.json): final hash, fall / no fall per runner (and the fall time within ±1 step), the first
// contact step, and the scene's qualitative requirement (REQ below). --write records the current results as the new expectation (only when a
// candidate is deliberately re-frozen). Exit code 1 on any failure.
import fs from "fs";
const SC = await import(new URL("./hac_scenes.mjs", import.meta.url).href), L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, has = (k) => process.argv.includes("--" + k);
// the battery (instruction §15 A–I) and each scene's qualitative requirement on THIS candidate (what must keep holding)
export const BATTERY = [
  ["NC", "A undisturbed", { noFall: ["runner"], vMin: 0.9 }], ["PVP_TWIN", "twin (CANON)", { noFall: ["runner"] }], ["PVP_TWIN_EARLY", "twin (EARLY)", { noFall: ["runner"] }], ["PVP_TWIN_UNLOAD", "twin (UNLOAD)", { noFall: ["runner"] }],
  ["PUSH_BRUSH", "B brush (push 30 N·s)", { noFall: ["runner"] }], ["PUSH_BUMP", "C bump (push 60 N·s)", { noFall: ["runner"] }], ["PUSH_STRONG", "D strong (push 100 N·s)", {}],
  ["PUSH_BRUSH_OPP", "E brush, other side", { noFall: ["runner"] }], ["PUSH_BUMP_OPP", "E bump, other side", { noFall: ["runner"] }], ["PUSH_STRONG_OPP", "E strong, other side", {}],
  ["SH_BRUSH", "two runners: brush (HR1 fixture)", { noFall: ["runner", "tackler"] }], ["SH_BUMP", "two runners: bump (HR1 fixture)", {}], ["SH_STRONG", "two runners: strong (HR1 fixture)", {}],
  ["SH2_BRUSH", "two runners: brush (SH2)", {}], ["SH2_BUMP", "two runners: bump (SH2)", {}], ["SH2_STRONG", "two runners: strong (SH2)", {}],
  ["PVP_F2", "F tackle F2 (CANON)", {}], ["PVP_F3", "G tackle F3 (CANON)", {}], ["PVP_F2_EARLY", "H tackle F2, early support", {}], ["PVP_F3_EARLY", "H tackle F3, early support", {}],
  ["PVP_F2_UNLOAD", "I tackle F2, unloading", {}], ["PVP_F3_UNLOAD", "I tackle F3, unloading", {}]];
export function outcome(o) { const h = 1 / 240, fall = (role, nMax = 1e9) => { for (const r of o.recs) { if (r.t / h > nMax + 0.5) break; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && !/^foot_/.test(x[1])) return Math.round(r.t / h); } } return null; };
  let fc = null; for (const r of o.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) { fc = Math.round(r.t / h); break; }
  const vmin = (lg) => lg ? Math.min(...lg.filter(Boolean).map(x => x.V.f)) : null, cAt = (lg) => { if (!lg) return null; const x = lg.find(y => y && y.V.C > 0.5); return x ? x.n : null; };
  const two = o.label2 === "hac"; return { hash: o.finalHash, steps: o.recs.length, firstContact: fc, fallA: fall("runner"), fallB: two ? fall("tackler", SC.validSteps(o.intentT.k0)) : null, vMinA: vmin(o.lawR), vMinB: two ? vmin(o.lawT) : null, commitA: cAt(o.lawR), commitB: two ? cAt(o.lawT) : null }; }
if (process.argv[1] && process.argv[1].endsWith("hac_test.mjs")) {
  const expF = arg("expect"), EXP = expF && fs.existsSync(expF) ? JSON.parse(fs.readFileSync(expF)) : { scenes: {} }, only = arg("only") ? arg("only").split(",") : null, runsDir = arg("runs"), out = { scenes: {} };
  let fails = 0; const t0 = performance.now();
  for (const [nm, label, req] of BATTERY) { if (only && !only.includes(nm)) continue;
    const a = await SC.runScene(nm, 783), b = await SC.runScene(nm, 783), oa = outcome(a), ob = outcome(b), msgs = [];
    if (oa.hash !== ob.hash) msgs.push(`NONDETERMINISTIC ${oa.hash} vs ${ob.hash}`);
    for (const role of req.noFall || []) { const f = role === "runner" ? oa.fallA : oa.fallB; if (f != null) msgs.push(`REQ ${role} must not fall (fell at step ${f})`); }
    if (req.vMin != null && oa.vMinA < req.vMin) msgs.push(`REQ viability ≥ ${req.vMin} (min ${oa.vMinA.toFixed(2)})`);
    const e = EXP.scenes[nm]; if (e && !has("write")) { if (e.hash !== oa.hash) msgs.push(`hash ${oa.hash} ≠ expected ${e.hash}`);
      for (const k of ["fallA", "fallB"]) { if ((e[k] == null) !== (oa[k] == null) || (e[k] != null && Math.abs(e[k] - oa[k]) > 1)) msgs.push(`${k} ${oa[k]} ≠ expected ${e[k]}`); }
      if (e.firstContact !== oa.firstContact) msgs.push(`first contact ${oa.firstContact} ≠ expected ${e.firstContact}`); }
    else if (!e && !has("write")) msgs.push("no expectation recorded");
    out.scenes[nm] = { label, ...oa }; if (runsDir) { fs.mkdirSync(runsDir, { recursive: true }); L.writeGz(`${runsDir}/${nm}.json.gz`, a); }
    const ok = msgs.length === 0; if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + nm.padEnd(16), label.padEnd(26), `hash ${oa.hash}`, `fallA ${oa.fallA ?? "-"}`, `fallB ${oa.fallB ?? "-"}`, `fc ${oa.firstContact ?? "-"}`, msgs.join("; ")); }
  console.log(`${fails} failure(s); ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  if (has("write") && expF) { fs.writeFileSync(expF, JSON.stringify({ note: "HAC-1 regression expectations (written by hac_test.mjs --write)", written: new Date().toISOString(), ...out }, null, 1)); console.log("expectations written:", expF); }
  process.exit(fails ? 1 : 0); }
