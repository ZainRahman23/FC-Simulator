// BALANCE-2 P8 DIAGNOSTIC (post-hoc): foot displacement vs the twin after B2M back.small on C3 (test-side check: does the world-frame COM difference include foot slip?). usage (worktree root): node .../p8_feet.mjs [nonoise]
const RA = process.cwd() + "/review_artifacts/physical_character_v2/";
const BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(RA + "balance2/scripts/b2_qualify.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), SPEC = PL.SPEC_R(), fs = await import("fs"), J = (p) => JSON.parse(fs.readFileSync(RA + p));
const BODY = J("balance1/params/B1_BODY.json"), P = J("balance2/c3/params/C3.json"), FL = SPEC.bodies.findIndex(b => b.name === "foot_L"), FR = SPEC.bodies.findIndex(b => b.name === "foot_R");
const noise = process.argv[2] === "nonoise"; const cp = noise ? { ...P, noise: { ...P.noise, cv: 0 } } : P;
const mk = () => new C3Controller(cp), base = await runOne({ law: "M1B", params: BODY, ctrl: mk, steps: 1440 }), o = await runOne({ law: "M1B", params: BODY, ctrl: mk, steps: 1440, perturb: BT.pushJob("back", B2M.J.back.small, 480, 12) });
for (const t of [0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 3.99]) { const q = 480 + Math.round(t * 240), a = base.recs[q], b = o.recs[q], fx = (r) => (r.S[FL].pos[0] + r.S[FR].pos[0]) / 2;
  const dcom = (b.chars.runner.com[0] - a.chars.runner.com[0]) * 1000, dfoot = (fx(b) - fx(a)) * 1000, dL = (b.S[FL].pos[0] - a.S[FL].pos[0]) * 1000, dR = (b.S[FR].pos[0] - a.S[FR].pos[0]) * 1000;
  console.log(`t ${t.toFixed(2)}  ΔCOM_x ${dcom.toFixed(2)} mm   Δfeet_x ${dfoot.toFixed(3)} mm (L ${dL.toFixed(3)} R ${dR.toFixed(3)})   ΔCOM rel feet ${(dcom - dfoot).toFixed(2)} mm`); }
