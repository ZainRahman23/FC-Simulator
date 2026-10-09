// HG-A investigation: summaries of evidence/decompose_{rx,def}.json (read-only)
import fs from "fs";
const J = ["rx", "def"].map(s => JSON.parse(fs.readFileSync(new URL(`../evidence/decompose_${s}.json`, import.meta.url))));
const cases = Object.assign({}, ...J.map(j => j.cases)), q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : NaN; };
const st = (a) => a.length ? `n ${a.length} min ${q(a, 0).toFixed(3)} p50 ${q(a, 0.5).toFixed(3)} p90 ${q(a, 0.9).toFixed(3)} max ${q(a, 1).toFixed(3)}` : "n 0";
const moving = Object.entries(cases).filter(([, c]) => c.moving), all = moving.flatMap(([n, c]) => c.frames.map(fr => ({ ...fr, cs: n, speed: c.speed })));
console.log("Mtot", J[0].Mtot.toFixed(2), "moving cases", moving.length, "frames", all.length);
console.log("\n== 1. presentation decomposition across the running cycle (moving cases, all frames in range) ==");
for (const ph of ["stance", "flight"]) { const a = all.filter(x => x.support === ph); console.log(ph.padEnd(7), "HG-A |vcom-vauth|_h", st(a.map(x => x.HGA)), "| Pint_h N·s", st(a.map(x => x.PintH))); }
const wr = all.filter(x => x.comAcc); console.log("implied horizontal external force / BW, flight3 frames:", st(wr.filter(x => x.flight3).map(x => x.FhBW)));
console.log("implied horizontal external force / BW, other frames:  ", st(wr.filter(x => !x.flight3).map(x => x.FhBW)));
console.log("implied vertical (F_y/BW, 0 = free fall), flight3:     ", st(wr.filter(x => x.flight3).map(x => x.FyBW)));
console.log("COM vx: 2nd-order backward vs central difference |diff|:", st(wr.map(x => Math.hypot(x.comVel[0] - x.comVelCentral[0], x.comVel[2] - x.comVelCentral[2]))));
console.log("HG-A using the central difference (non-causal, evaluation only):", st(wr.map(x => Math.hypot(x.comVelCentral[0] - x.vAuth[0], x.comVelCentral[2] - x.vAuth[2]))));
const off = all.map(x => Math.hypot(...x.comMinusRootH)); console.log("COM − root horizontal offset (m):", st(off));
const dOff = []; for (const [n, c] of moving) for (let i = 1; i < c.frames.length; i++) { const a = c.frames[i - 1].comMinusRootH, b = c.frames[i].comMinusRootH; dOff.push(Math.hypot(b[0] - a[0], b[2] - a[2]) * 1000); }
console.log("frame-to-frame change of COM − root offset (mm):", st(dOff));
console.log("pelvis − root horizontal offset (m):", st(all.map(x => Math.hypot(...x.pelvisMinusRootH))), "| pelvis vel vs auth:", st(all.map(x => Math.hypot(x.pelvisVel[0] - x.vAuth[0], x.pelvisVel[2] - x.vAuth[2]))));
console.log("|L about COM| kg·m²/s:", st(all.map(x => x.LcomMag)), "| KE_int J:", st(all.map(x => x.KEint)));
console.log("gait-cycle mean COM velocity vs authoritative:", moving.flatMap(([n, c]) => c.cycles.map(y => `${n} ${y.from}-${y.to} ${y.diffMs}`)).join("; "));
console.log("stance-foot sole horizontal speed (presentation-mapped, foot flagged in contact):", st(all.flatMap(x => ["L", "R"].filter(s => x.feet[s].presContact).map(s => x.feet[s].soleSpeedH))));
console.log("\n== 2. A / B / Ch / C3 over the HG-A-only frames ==");
const ho = all.filter(x => x.hgaOnly && x.inits); console.log("HG-A-only frames:", ho.length, ho.map(x => x.cs + ":" + x.k).join(" "));
const show = (set, lbl) => { console.log(`-- ${lbl} (n ${set.length})`); for (const X of ["A", "B", "Ch", "C3"]) { const g = (fn) => set.map(x => fn(x.inits[X]));
  console.log(X.padEnd(3), "dP_h vs auth N·s", st(g(m => m.dPh_vsAuth)), "\n    dPy vs pres N·s", st(g(m => Math.abs(m.dPy_vsPres))), "| dL rel", st(g(m => m.dLrel)), "\n    seg |Δv| max", st(g(m => m.segVmax)), "| seg |Δω| max", st(g(m => m.segWmax)),
    "\n    stance-sole slip speed", st(set.flatMap(x => ["L", "R"].filter(s => x.inits[X].feet[s].presContact).map(s => x.inits[X].feet[s].soleSpeedH))), "| Δsole vel (all feet) max", st(g(m => Math.max(m.feet.L.dSoleVel, m.feet.R.dSoleVel))),
    "\n    pelvis vs auth (h)", st(g(m => m.pelvisVsAuthH)), "| vis vs LAST mm", st(g(m => m.visLastMm)), "| vis vs NEXT mm", st(g(m => m.visNextMm)),
    "\n    dKE vs pres J", st(g(m => m.dKE_vsPres)), "| dKE vs auth ref J", st(g(m => m.dKE_vsAuthRef))); }
  console.log("    presentation's own one-frame change |d_next − d_last| mm", st(set.map(x => x.inits.A.presOwnMm))); };
show(ho, "HG-A-only frames"); show(all.filter(x => x.inWindow && x.inits), "all moving-case window frames");
