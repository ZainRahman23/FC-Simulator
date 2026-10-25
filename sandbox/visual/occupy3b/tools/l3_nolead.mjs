// occupy3b/tools/l3_nolead.mjs — §3 / §9 THE EQUAL-SPEED / NO-LEAD FAMILY: every side-by-side row of the Stage 3B cases (the flagship, walk / jog /
// run, the overtake, the glance) and its mirror, OLD STAGE 3 against STAGE 3B: the impulse the contact gave each player (Σ, along the carrier's
// heading, across it), the impact's own root shifts along the heading (ATT − DEF: the LEAD), and the mirror pair's agreement (the mirrored row's
// lead and impulses must equal the row's).   node l3_nolead.mjs [--json f]
import { ENV, runO3, arg } from "./l3_common.mjs";
import { L3CASES } from "../l3_cases.js";
import fs from "node:fs";
const IDS = ["side", "side-walk", "side-run", "overtake", "glance"];
const headAt = (W, t) => { const s = W.att.stateAt(t); return [Math.cos(s.psi), Math.sin(s.psi)]; };
function measure(id, mode) { const tc = L3CASES.find((x) => x.id === id), R = runO3(ENV, tc, mode, { record: false }), W = R.W, own = [0, 0]; let mx = 0;
  for (const r of W.imp.log) { const h = headAt(W, r.t); (r.p || []).forEach((q, i) => { if (q && q.root) own[i] += q.root[0] * h[0] + q.root[1] * h[1]; }); mx = Math.max(mx, Math.abs(own[0] - own[1])); }
  // (the impulse each player received from the contact: OLD — Stage 3's whole input (its limb strikes + body contacts); 3B — Stage 3's input, by source)
  let J = [0, 0], fwd = 0, lat = 0, lim = 0;
  if (mode === "S3B") { for (const a of W.l3.apps) { const h = headAt(W, a.k / 240), j = [a.n[0] * a.lam, a.n[1] * a.lam]; fwd += j[0] * h[0] + j[1] * h[1]; lat += -j[0] * h[1] + j[1] * h[0]; lim += a.lam; } J = W.l3.acc.ATT.S3_BODY; }
  else { for (const e of W.imp.events.filter((x) => /LIMB STRIKE/.test(x.kind))) { const m = /: ([\d.]+) N·s/.exec(e.why || e.txt || ""); if (m) lim += +m[1]; } }
  const ep = W.imp.episodes;
  return { lead: own[0] - own[1], maxLead: mx, att: own[0], def: own[1], limbJ: lim, fwd, lat, s3Body: J, eps: ep.length, sev: ep.map((e) => Object.entries(e.players).map(([k, q]) => `${k} ${q.sev}/${q.cls}`).join(", ")).join(" | ") }; }
const rows = [];
console.log(`§9 EQUAL-SPEED / NO-LEAD — OLD STAGE 3 vs STAGE 3B, each row and its mirror (lead = ATT − DEF of the impact's own root shifts along the carrier's heading)`);
console.log(`${"case".padEnd(14)}${"OLD limb J".padStart(12)}${"OLD lead cm".padStart(13)}${"3B limb λ Σ".padStart(13)}${"3B along hdg".padStart(14)}${"3B lead cm".padStart(12)}${"3B max |lead|".padStart(15)}  mirror: |Δlead| OLD · 3B (cm)`);
for (const id of IDS) { const o = measure(id, "S3"), b = measure(id, "S3B"), om = measure(id + "-m", "S3"), bm = measure(id + "-m", "S3B");
  rows.push({ id, OLD: o, S3B: b, OLDm: om, S3Bm: bm });
  console.log(`${id.padEnd(14)}${o.limbJ.toFixed(2).padStart(12)}${(o.lead * 100).toFixed(1).padStart(13)}${b.limbJ.toFixed(2).padStart(13)}${b.fwd.toFixed(3).padStart(14)}${(b.lead * 100).toFixed(1).padStart(12)}${(b.maxLead * 100).toFixed(1).padStart(15)}  ${(Math.abs(o.lead - om.lead) * 100).toFixed(2)} · ${(Math.abs(b.lead - bm.lead) * 100).toFixed(2)}`);
  console.log(`${"".padEnd(14)}OLD: ${o.sev || "no episode"}\n${"".padEnd(14)}3B:  ${b.sev || "no episode"}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));
