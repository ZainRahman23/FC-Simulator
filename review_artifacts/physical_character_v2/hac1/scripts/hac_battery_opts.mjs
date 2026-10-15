// Battery under an options override (HAC1_LOG §10–11): determinism + fall / no-fall against the frozen V1 expectations; optional records folder.
// usage (worktree root): node hac_battery_opts.mjs '<opts JSON>' [records dir]
const RA = process.cwd() + "/review_artifacts/physical_character_v2/";
const SC = await import(RA + "hac1/scripts/hac_scenes.mjs"), T = await import(RA + "hac1/scripts/hac_test.mjs"), fs = await import("fs");
const opts = JSON.parse(process.argv[2] || "{}"), EXP = JSON.parse(fs.readFileSync(RA + "hac1/evidence/HAC1_expectations.json")).scenes, runs = process.argv[3];
for (const [nm, label, req] of T.BATTERY) { const a = await SC.runScene(nm, 783, opts), b = await SC.runScene(nm, 783, opts), oa = T.outcome(a), ob = T.outcome(b), e = EXP[nm];
  const det = oa.hash === ob.hash ? "det" : "NONDET", rq = (req.noFall || []).filter(r => (r === "runner" ? oa.fallA : oa.fallB) != null).map(r => "REQ-FAIL " + r).join(" ");
  if (runs) { fs.mkdirSync(runs, { recursive: true }); (await import(RA + "slide_phys1/scripts/sp_lib.mjs")).writeGz(`${runs}/${nm}.json.gz`, a); }
  console.log(nm.padEnd(16), det, "fallA", String(oa.fallA ?? "-").padEnd(4), "(was", String(e.fallA ?? "-").padEnd(4) + ")", "fallB", String(oa.fallB ?? "-").padEnd(4), "(was", String(e.fallB ?? "-") + ")", "commitA", oa.commitA ?? "-", rq); }
