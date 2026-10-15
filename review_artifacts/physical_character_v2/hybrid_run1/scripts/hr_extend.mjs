// HYBRID-RUN-1 extended window: every scene run on to the END OF ITS RUN-1 DATA. The recipient run-in (run1r_4.147.json) has 1249 frames, so an
// intent that starts at frame 462 (A, NC, PVP) is valid for 785 steps (3.27 s) and B's (frame 543) for 704 steps (2.93 s); after that the intent
// freezes on its last frame (zero intended velocity), which is not a running intent. The frozen 720-step records are identical step for step to
// the first 720 steps of these runs (checked: per-step hashes). A fall is the first non-boot body on the turf.
// usage (worktree root): node hr_extend.mjs <out records dir> <out json>
import fs from "fs";
const H = new URL("./", import.meta.url).href, HS = await import(H + "hr_scenes.mjs"), L = await import(H + "../../slide_phys1/scripts/sp_lib.mjs"), RI = await import(H + "../../pvp1_running/scripts/pvp1_recipient.mjs");
const [dir, outJ] = process.argv.slice(2), h = 1 / 240, nF = RI.loadRun(HS.RUNIN_R).F.length, endA = nF - 2 - HS.K0 - 2, endB = nF - 2 - (HS.K0 + HS.PHASE_B) - 2; fs.mkdirSync(dir, { recursive: true });
const r3 = (x) => Math.round(x * 1000) / 1000;
const fallOf = (o, role, nMax) => { for (const r of o.recs) { if (r.t / h > nMax + 0.5) break; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && !/^foot_/.test(x[1])) return { t: r3(r.t), body: x[1] }; } } return null; };
const firstT = (o) => { for (const r of o.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) return r3(r.t); return null; };
const lastT = (o) => { let t = null; for (const r of o.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) t = r3(r.t); return t; };
const out = { note: "scenes run to the end of the RUN-1 data", runinFrames: nF, validStepsA: endA, validS_A: r3(endA * h), validStepsB: endB, validS_B: r3(endB * h), scenes: {} };
for (const nm of ["NC", "PVP_TWIN", "SH_BRUSH", "SH_BUMP", "SH_STRONG", "PVP_F2", "PVP_F3"]) { const o = await HS.runScene(nm, endA); L.writeGz(`${dir}/${nm}.json.gz`, o);
  const fc = firstT(o), fA = fallOf(o, "runner", endA), two = nm.startsWith("SH_"), fB = two ? fallOf(o, "tackler", endB) : null;
  out.scenes[nm] = { hash: o.finalHash, steps: o.recs.length, firstContactS: fc, lastContactS: lastT(o), runnerA: { fall: fA, fallAfterFirstContactS: fA && fc != null ? r3(fA.t - fc) : null, validToS: r3(endA * h) },
    runnerB: two ? { fall: fB, fallAfterFirstContactS: fB && fc != null ? r3(fB.t - fc) : null, validToS: r3(endB * h) } : null }; console.log(nm, JSON.stringify(out.scenes[nm])); }
fs.writeFileSync(outJ, JSON.stringify(out, null, 1));
