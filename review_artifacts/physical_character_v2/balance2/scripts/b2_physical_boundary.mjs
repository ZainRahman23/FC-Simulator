// BALANCE-2 POST-HOC DIAGNOSTIC (written after the C2 B2M run; NOT a criterion, NOT preregistered; reported): the PHYSICAL no-step recovery
// boundary, to check what the frozen fall rule cannot see. The frozen rule (ppr3_battery.recovery) scores a fall when the COM leaves the STATIC
// entry support polygon (battery edge fwd 103 mm ahead of the entry COM) — the human "would need a step" definition. The §18 review records showed
// C2 returning to standing from the 21.5 N·s over-limit forward push after its COM reached 138 mm ahead with the rigid boots pitched ≈ 14° onto
// their tips. Here a push is a PHYSICAL fall only if, within the 4 s window, the pelvis drops > 150 mm or a foot unloads > 50 ms, or the COM is
// not back within 30 mm of the twin over the last 0.5 s; otherwise it is a physical recovery (feet in place) — and the run also reports whether
// the frozen rule called it a fall, the peak COM excursion and the peak foot pitch (heel lift onto the boot tip).
// usage (worktree root): node .../b2_physical_boundary.mjs --ctrl <json> [--ctrlModule <path> --ctrlClass <name>] --dirs fwd,back --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(new URL("./b2_qualify.mjs", import.meta.url).href);
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { Q } = PL, SPEC = PL.SPEC_R(), FOOT = ["foot_L", "foot_R"].map(n => SPEC.bodies.findIndex(b => b.name === n));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function boundary(CFG, dirs) { const CM = await import(CFG.ctrlModule || (RA + "balance1/scripts/b1_ctrl.mjs")), Ctrl = CM[CFG.ctrlClass || "BalanceController"], body = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
  const steps = B2M.onset + B2M.window, job = (x) => ({ law: "M1B", params: body, ctrl: () => new Ctrl(CFG.ctrl), steps, ...x }), base = await runOne(job({})), edges = BT.bos(base.recs, B2M.onset - 6, B2M.onset), out = {};
  const pitch = (r, b) => { const f = Q.rot(r.S[b].rot, [0, 0, 1]); return Math.asin(Math.max(-1, Math.min(1, f[1]))) * 180 / Math.PI; };
  const classify = (o, dir) => { const A = base.recs, P = o.recs, n = Math.min(A.length, P.length), ax = dir === "fwd" || dir === "back" ? 0 : 2, y0 = P[B2M.onset - 1].S[0].pos[1]; let drop = null, peak = 0, pmax = 0, unl = 0, unload = null;
    for (let q = B2M.onset; q < n; q++) { const r = P[q]; if (drop == null && (y0 - r.S[0].pos[1]) * 1000 > 150) drop = (q - B2M.onset) / 240; peak = Math.max(peak, Math.abs(r.chars.runner.com[ax] - A[q].chars.runner.com[ax]) * 1000);
      pmax = Math.max(pmax, ...FOOT.map(f => Math.abs(pitch(r, f) - pitch(A[q], f)))); const ft = r.chars.runner.feet, fl = ft ? [ft.L * 240, ft.R * 240] : null; // per-step turf impulse → N
      if (fl && fl.some(v => v < 5)) { unl++; if (unload == null && unl > 12) unload = (q - B2M.onset) / 240; } else unl = 0; }
    const tail = P.slice(Math.max(B2M.onset, n - 120), n).map((r, i) => Math.abs(r.chars.runner.com[ax] - A[n - 120 + i].chars.runner.com[ax]) * 1000), back = tail.length && Math.max(...tail) <= 30;
    const frozen = BT.recovery(base, o, B2M.onset, B2M.window, edges, B2M.recovery); return { physicalFall: drop != null || unload != null || !back || !!o.stop, pelvisDropAtS: drop, footUnloadAtS: unload, comBackWithin30mm: back, peakComMm: +peak.toFixed(1), peakFootPitchDeg: +pmax.toFixed(1), frozenRuleFall: frozen.fall ? frozen.fall.cause : null }; };
  for (const dir of dirs) { const grid = []; for (const J of (dir === "fwd" ? [14.83, 16.64, 18.22, 20, 21.5, 23, 25, 28] : [17.98, 19.55, 22.08, 24, 26.07, 28, 31])) grid.push({ J, ...classify(await runOne(job({ perturb: BT.pushJob(dir, J, B2M.onset, B2M.pulse) })), dir) });
    let lo = 0, hi = 45; for (let it = 0; it < 7; it++) { const J = (lo + hi) / 2, c = classify(await runOne(job({ perturb: BT.pushJob(dir, J, B2M.onset, B2M.pulse) })), dir); if (c.physicalFall) hi = J; else lo = J; }
    out[dir] = { grid, physicalBoundaryNs: +((lo + hi) / 2).toFixed(2), bracket: [+lo.toFixed(2), +hi.toFixed(2)] }; }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b2_physical_boundary.mjs")) { const CFG = { ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))), ctrlModule: arg("ctrlModule") ? new URL(arg("ctrlModule"), "file://" + process.cwd() + "/").href : undefined, ctrlClass: arg("ctrlClass") };
  const B = await boundary(CFG, arg("dirs", "fwd,back").split(",")); B.label = arg("label", ""); B.note = "POST-HOC DIAGNOSTIC, not a criterion"; fs.writeFileSync(arg("out"), JSON.stringify(B, null, 1));
  for (const [d, r] of Object.entries(B)) if (r && r.grid) { console.log(B.label, d, "PHYSICAL boundary", r.physicalBoundaryNs, "N·s"); for (const g of r.grid) console.log(`   ${String(g.J).padEnd(6)} physical ${g.physicalFall ? "FALL" : "recovers"}  frozen-rule ${g.frozenRuleFall ? "fall" : "ok"}  peakCOM ${g.peakComMm}  footPitch ${g.peakFootPitchDeg}°  ${g.pelvisDropAtS != null ? "drop@" + g.pelvisDropAtS.toFixed(2) : ""}${g.footUnloadAtS != null ? " unload@" + g.footUnloadAtS.toFixed(2) : ""}`); } }
