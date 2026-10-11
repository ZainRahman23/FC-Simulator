// IFM-1 SLOW-MOTION REVIEW — per-frame metadata for the review page (visualisation only): for every video frame k, the record step, τ, the validity
// band, recorded receiver–impactor normal impulse, recorded per-foot turf normal impulse (C0 / N), and the largest N − C0 rendered-joint distance.
// usage: node ifm1_slowmo_frames.mjs <prep dir> <capture dir> <out.json>
import fs from "fs"; import path from "path";
const [PREP, CAP, OUT] = process.argv.slice(2), CAPJ = JSON.parse(fs.readFileSync(path.join(CAP, "slowmo_capture.json"))), META = JSON.parse(fs.readFileSync(path.join(PREP, "slowmo_meta.json")));
const r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000, out = { fps025: 60, fps010: 24, recordHz: 240, cases: {} };
for (const f of fs.readdirSync(PREP).filter(f => /^slowmo_(SH|PL|TP|SW)_/.test(f)).sort()) { const D = JSON.parse(fs.readFileSync(path.join(PREP, f))), key = `${D.case}_${D.body}`, cap = CAPJ.cases[key];
  out.cases[key] = { case: D.case, body: D.body, title: D.title, state: D.state, invalid: D.invalid, invalidText: D.invalidText, statusN: D.statusN, statusC0: D.statusC0, healthyControlUntilMs: D.healthyControlUntilMs, healthyReason: D.healthyReason,
    ownSecondaryFailure: D.ownSecondaryFailure, contact: D.contact, target: D.target,
    frames: D.frames.map((F, k) => { const lead = F.phase === "lead";
      const dv = lead ? null : F.divergenceMm, mi = dv ? dv.indexOf(Math.max(...dv)) : -1;
      return { k, phase: F.phase, n: F.n, tauMs: r3(F.tauMs), band: lead ? "lead" : F.band, panelDiffPx: cap.frames[k].panelDiffPx,
        contactJn: lead ? null : r3(F.N.opp.reduce((s, c) => s + c.Jn, 0)), footC0: lead ? null : F.C0.footLoadNs, footN: lead ? null : F.N.footLoadNs, run1Legs: lead ? F.run1Legs : null,
        maxDivMm: dv ? r3(dv[mi]) : null, maxDivJoint: dv ? META.bones[mi].name : null }; }) }; }
fs.writeFileSync(OUT, JSON.stringify(out)); console.log(Object.keys(out.cases).length, "cases →", OUT);
