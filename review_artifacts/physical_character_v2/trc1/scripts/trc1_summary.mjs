// TRC-1 summary (read-only): gathers the joint audits (TRC1_JOINTS_*.json) and the mesh audits (TRC1_MESH_*.json.gz) into TRC1_SUMMARY.json for the
// review page and the report. No new measurement here.
// usage: node trc1_summary.mjs  (from anywhere; reads / writes trc1/evidence)
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
const EV = fileURLToPath(new URL("../evidence/", import.meta.url)), rd = (f) => (f.endsWith(".gz") ? JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(EV, f)))) : JSON.parse(fs.readFileSync(path.join(EV, f))));
const TITLES = { DX_N2: "PVP-1A-DX native contact (committed)", DX_C0: "PVP-1A-DX no contact (C0)", CF1_A: "ABI-1 A · passive (CF1)", CF1_B: "ABI-1 B · active, no step", CF1_C: "ABI-1 C · active + step", CF1_A0: "ABI-1 A no contact (C0)", V075_A: "S-IMPACT 0.75× A", V075_B: "S-IMPACT 0.75× B", V075_C: "S-IMPACT 0.75× C" };
const GROUPS = ["boots", "shins_calves", "thighs", "pelvis_torso", "arms", "head"];
const out = { tool: "trc1_summary.mjs", joints: {}, mesh: {} };
for (const f of fs.readdirSync(EV).filter(f => /^TRC1_JOINTS_.*\.json$/.test(f)).sort()) { const j = rd(f), k = j.label;
  out.joints[k] = { title: TITLES[k], window: j.window, finalHash: j.finalHash, before: j.tackler.before_MC1, after: j.tackler.after_MC1P, runner: j.runner_MC1_unchanged }; if (!out.corrections) out.corrections = j.corrections; }
for (const f of fs.readdirSync(EV).filter(f => /^TRC1_MESH_.*\.json\.gz$/.test(f)).sort()) { const m = rd(f), k = m.label, W = m.frames.filter(x => x.window === "w");
  const fcFrame = m.frames.find(x => x.n >= 1 && x.phys.some(c => c.J > 1e-3));   // the configuration whose manifold first carries an impulse (applied in step n + 1)
  const firstVis = (rule) => { const x = m.frames.find(x => x[rule].inside > 0); return x ? { n: x.n, maxMm: x[rule].maxMm } : null; };
  out.mesh[k] = { title: TITLES[k], window: m.window, finalHash: m.finalHash, every: m.every,
    series: { collider: m.frames.map(x => [x.n, x.colliders.minSepMm]), before: m.frames.map(x => [x.n, x.before.robustMm, x.before.maxMm]), after: m.frames.map(x => [x.n, x.after.robustMm, x.after.maxMm]),
      afterGroups: Object.fromEntries(GROUPS.map(g => [g, m.frames.map(x => [x.n, x.after.groups[g].robustMm, x.after.groups[g].maxMm])])) },
    window_stats: m.window_stats,
    firstContact: fcFrame ? { configN: fcFrame.n, impulseStep: fcFrame.n + 1, phys: fcFrame.phys.filter(c => c.J > 1e-3), colliders: fcFrame.colliders, before: fcFrame.before.visual, after: fcFrame.after.visual, beforeMaxMm: fcFrame.before.maxMm, afterMaxMm: fcFrame.after.maxMm, afterPairs: fcFrame.after.pairs, beforePairs: fcFrame.before.pairs } : null,
    firstVisibleOverlap: { before: firstVis("before"), after: firstVis("after") },
    contactLocation: W.filter(x => x.phys.some(c => c.J > 1e-3)).map(x => ({ n: x.n, phys: [...new Set(x.phys.filter(c => c.J > 1e-3).map(c => c.pair))], before: x.before.visual && { pair: `T.${x.before.visual.tackler} × R.${x.before.visual.runner}`, distMm: x.before.visual.distToPhysContactMm }, after: x.after.visual && { pair: `T.${x.after.visual.tackler} × R.${x.after.visual.runner}`, distMm: x.after.visual.distToPhysContactMm } })),
    envelope: m.envelope };
  const sites = W.flatMap(x => x.phys.filter(c => c.site).map(c => ({ n: x.n, pair: c.pair, J: c.J, before: c.site.before.sepMm, after: c.site.after.sepMm })));
  out.mesh[k].contactSites = sites;
  const sst = (r) => { const v = sites.map(x => x[r]).filter(x => x != null).sort((a, b) => a - b); return { contacts: sites.length, measured: v.length, medianMm: v.length ? v[Math.floor((v.length - 1) / 2)] : null, deepestOverlapMm: v.length ? v[0] : null, largestGapMm: v.length ? v[v.length - 1] : null, gapsOver2mm: v.filter(x => x > 2).length, overlapsOver10mm: v.filter(x => x < -10).length, overlapsOver20mm: v.filter(x => x < -20).length }; };
  out.mesh[k].contactSiteStats = { before: sst("before"), after: sst("after"), byPair: Object.fromEntries([...new Set(sites.map(x => x.pair))].map(p => { const v = sites.filter(x => x.pair === p); return [p, { contacts: v.length, after: { min: Math.min(...v.map(x => x.after ?? 0)), max: Math.max(...v.map(x => x.after ?? 0)) }, before: { min: Math.min(...v.map(x => x.before ?? 0)), max: Math.max(...v.map(x => x.before ?? 0)) } }]; })) };
  if (out.mesh[k].firstContact) out.mesh[k].firstContact.sites = fcFrame.phys.filter(c => c.site).map(c => ({ pair: c.pair, J: c.J, before: c.site.before.sepMm, after: c.site.after.sepMm }));
  const cl = out.mesh[k].contactLocation, med = (a) => { const s = a.filter(x => x != null).sort((p, q) => p - q); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  out.mesh[k].contactLocationStats = Object.fromEntries(["before", "after"].map(r => [r, { frames: cl.length, samePairFrames: cl.filter(x => x[r] && x.phys.includes(x[r].pair)).length, sameTacklerBodyFrames: cl.filter(x => x[r] && x.phys.some(p => p.split(" × ")[0] === x[r].pair.split(" × ")[0])).length, medianDistMm: med(cl.map(x => x[r] && x[r].distMm)), maxDistMm: Math.max(...cl.map(x => (x[r] && x[r].distMm) || 0)) }])); }
// inside / outside validation (trc1_mesh.mjs --signCheck): CXA-1 sign vs TRC-1 sign, disputes and deep agreed vertices arbitrated by 7-ray parity
out.signCheck = {};
for (const f of fs.readdirSync(EV).filter(f => /^TRC1_SIGNCHECK_.*\.json$/.test(f)).sort()) { const o = rd(f), t = { steps: 0, cxa1Inside: 0, trc1Inside: 0, agreeInside: 0, cxa1Only: { n: 0, parityInside: 0, parityOutside: 0 }, trc1Only: { n: 0, parityInside: 0, parityOutside: 0 }, deepAgreed: { n: 0, parityInside: 0, parityOutside: 0 }, confirmedMaxMm: 0, confirmedMaxStep: null, refutedDeepMaxMm: 0 };
  for (const [n, r] of Object.entries(o.steps)) { t.steps++; for (const k of ["cxa1Inside", "trc1Inside", "agreeInside"]) t[k] += r[k]; for (const c of ["cxa1Only", "trc1Only"]) for (const k of ["n", "parityInside", "parityOutside"]) t[c][k] += r[c][k];
    if (r.deepAgreed) { for (const k of ["n", "parityInside", "parityOutside"]) t.deepAgreed[k] += r.deepAgreed[k]; for (const [d, ins] of r.deepAgreed.depths) { if (ins >= 4 && d > t.confirmedMaxMm) { t.confirmedMaxMm = d; t.confirmedMaxStep = +n; } if (ins < 4) t.refutedDeepMaxMm = Math.max(t.refutedDeepMaxMm, d); } } }
  out.signCheck[`${o.label} ${o.rule.startsWith("after") ? "after" : "before"}`] = t; }
fs.writeFileSync(path.join(EV, "TRC1_SUMMARY.json"), JSON.stringify(out));
for (const [k, t] of Object.entries(out.signCheck)) console.log(`signCheck ${k}: ${JSON.stringify(t)}`);
for (const [k, s] of Object.entries(out.mesh)) { const a = s.window_stats.after, b = s.window_stats.before;
  console.log(`${k}: colliders min sep ${s.window_stats.colliders_minSepMm.min} mm | mesh robust median/max BEFORE ${b.all.robust.median}/${b.all.robust.max} AFTER ${a.all.robust.median}/${a.all.robust.max} | max-vertex BEFORE ${b.all.max.median}/${b.all.max.max} AFTER ${a.all.max.median}/${a.all.max.max}`);
  console.log(`   AFTER by anatomy robust median/max: ${GROUPS.map(g => `${g} ${a.groups[g].robust.median}/${a.groups[g].robust.max}`).join(" · ")}`);
  console.log(`   BEFORE by anatomy robust median/max: ${GROUPS.map(g => `${g} ${b.groups[g].robust.median}/${b.groups[g].robust.max}`).join(" · ")}`);
  console.log(`   first visible overlap: before ${JSON.stringify(s.firstVisibleOverlap.before)} after ${JSON.stringify(s.firstVisibleOverlap.after)} | first contact config ${s.firstContact && s.firstContact.configN} colliders ${s.firstContact && s.firstContact.colliders.minSepMm} mm phys ${s.firstContact && s.firstContact.phys.map(c => c.pair).join(",")} | after visual ${JSON.stringify(s.firstContact && s.firstContact.after)}`);
  console.log(`   contact location: ${JSON.stringify(s.contactLocationStats)}`);
  console.log(`   visual separation AT the Jolt contacts (mm, < 0 overlap): ${JSON.stringify(s.contactSiteStats)} | first contact sites ${JSON.stringify(s.firstContact && s.firstContact.sites)}`);
  console.log(`   AFTER pairs (top 5 by robust max): ${Object.entries(a.pairs).slice(0, 5).map(([p, e]) => `${p} ${e.robustMaxMm}/${e.maxMm} (${e.frames} fr)`).join(" · ")}`); }
