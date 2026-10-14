// SP2A qualification of one parameter set (physical options JSON, as sp2a_search.mjs toOpts produces):
//   • the three RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s tackler speed) — SP2 measures + SP2A cost, contact sequence, region loads (impulse, 29 ms peaks),
//     tackling-boot clearance / load, fold-leg geometry at first contact (knee / shin / thigh / hip heights, boot sole orientation), slide
//     distance / deceleration, constraint-space joint-limit audit;
//   • START-TRANSITION (sp2a_transition.mjs): contacts, take-off, boundary continuity, seam (vs RUN-1's own continuation), flight legitimacy;
//   • root / momentum legitimacy: the plant's own per-step linear and angular momentum residuals (ΔP − contact impulses − gravity) — any hidden
//     root drive or teleport would appear here;
//   • determinism: the 5.0 m/s run repeated, final hash compared.
// usage (worktree root): node sp2a_eval.mjs --opts <opts.json> --runins a.json,b.json,c.json --out <evidence dir> [--records <dir outside git>]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CL = await import(S1 + "sp_climits.mjs"), { V, Q, B, bi } = L;
const R = await import(new URL("./sp2a_run.mjs", import.meta.url).href), FL = await import(new URL("./sp2a_flight.mjs", import.meta.url).href), SR = await import(new URL("./sp2a_search.mjs", import.meta.url).href), TR = await import(new URL("./sp2a_transition.mjs", import.meta.url).href);
const P2 = await import(new URL("../../slide_phys2/scripts/sp2_param.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const opts = JSON.parse(fs.readFileSync(arg("opts"))), runins = arg("runins").split(","), REC = arg("records"), BW = L.M * L.G, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const regionOfBody = (n) => /^foot_R$/.test(n) ? "tackBoot" : /^foot_L$/.test(n) ? "foldBoot" : n;
function analyse(o) { const m = P2.M.measure(o), c = SR.costSP2A(P2, m, o.climits, o, L), T = TR.series(o), tOff = o.tOffset || 0;
  // momentum legitimacy
  // (step 0 is the one permitted state write — the entry's velocities — and is reported separately)
  let lin = 0, ang = 0; const step0 = o.recs[0] && o.recs[0].chars.tackler.linRes ? { linNs: V.len(o.recs[0].chars.tackler.linRes), note: "entry write (the committed plant state's velocities)" } : null;
  for (const r of o.recs.slice(1)) { const a = r.chars.tackler; if (a.linRes) lin = Math.max(lin, V.len(a.linRes)); if (a.angRes) ang = Math.max(ang, V.len(a.angRes)); }
  // per-body turf impulse and 29 ms peak (BW)
  const imp = {}, win = 7, series = {}; o.recs.forEach((r, n) => { for (const x of r.contacts) { if (!x.kind.startsWith("turf") || !(x.Jn > 0)) continue; const b = (x.a === "turf" ? x.b : x.a)[1]; imp[b] = (imp[b] || 0) + x.Jn; (series[b] = series[b] || new Float64Array(o.recs.length))[n] += x.Jn; } });
  const peak = Object.fromEntries(Object.entries(series).map(([b, s]) => { let mx = 0, acc = 0; for (let n = 0; n < s.length; n++) { acc += s[n] - (n >= win ? s[n - win] : 0); mx = Math.max(mx, acc); } return [b, +(mx / (win / 240) / BW).toFixed(2)]; }));
  const first = {}; o.recs.forEach((r) => { for (const x of r.contacts) { if (!x.kind.startsWith("turf") || !(x.Jn > 0)) continue; const b = (x.a === "turf" ? x.b : x.a)[1]; if (first[b] == null) first[b] = +(r.t + tOff).toFixed(3); } });
  // fold-leg geometry at the first non-foot contact
  const k1 = o.recs.findIndex(r => r.contacts.some(x => x.kind.startsWith("turf") && x.Jn > 0 && !/^foot_/.test((x.a === "turf" ? x.b : x.a)[1]))); let geo = null;
  if (k1 > 0) { const S = o.recs[k1].S.slice(0, B.length), an = L.anatOf(S), lo = (n) => L.PL.bodyLowest(B[bi(n)], S[bi(n)]).y, f = S[bi("foot_L")], soleDown = -Q.rot(f.rot, [0, -1, 0])[1], fr = S[bi("foot_R")];
    geo = { t: +(o.recs[k1].t + tOff).toFixed(3), knee_L: r3(an.knee_L.flex), hip_L: { flex: r3(an.hip_L.flex), abd: r3(an.hip_L.abd), rot: r3(an.hip_L.rot) }, ankle_L: { df: r3(an.ankle_L.df), inv: r3(an.ankle_L.inv) },
      lowest: { foot_L: r3(lo("foot_L")), shank_L: r3(lo("shank_L")), thigh_L: r3(lo("thigh_L")), pelvis: r3(lo("pelvis")), foot_R: r3(lo("foot_R")) }, foldSoleDownCos: r3(soleDown), tackSoleDownCos: r3(-Q.rot(fr.rot, [0, -1, 0])[1]) }; }
  return { hash: o.finalHash, cost: r3(c.total), costParts: Object.fromEntries(Object.entries(c).filter(([k, x]) => k !== "total" && x > 0.005).map(([k, x]) => [k, r3(x)])), brief: P2.M.brief(m),
    firstContact: first, impulseNs: Object.fromEntries(Object.entries(imp).map(([k, v]) => [k, +v.toFixed(1)])), peak29msBW: peak, foldGeometryAtFirstBodyContact: geo,
    slideDistM: r3(m.slideDistM), meanDecel: r3(m.meanDecel), glideShare: m.glideShare, minBellyY: r3(m.posture && m.posture.minBellyY), headTurfT: m.posture ? m.posture.headTurfT : null,
    limits: CL.cTable(o.climits, 0.5).map(e => ({ id: e.id, beyondDeg: e.beyond, durS: e.dur, at: +(e.at + tOff).toFixed(3) })),
    transition: { events: T.events, continuity: T.continuity, seam: T.seam, flight: T.flight }, authoredFlight: o.flight || null, momentumResidual: { fromStep1: { maxLinNs: lin, maxAngNms: ang }, step0 }, takeover: o.takeover, tOffset: tOff, speedTackler: o.speedTackler, landPitchL: r3(m.landPitchL) }; }
const out = { tool: "sp2a_eval.mjs", opts, runins: runins.map(f => f.split("/").pop()), speeds: {} };
const runOne = (ri) => opts.mode === "flight" ? FL.runFlight(ri, { ...opts, id: opts.id || "SP2A" }, +arg("steps", "480")) : R.runSP2A(ri, null, { ...opts, id: opts.id || "SP2A" }, +arg("steps", "480"));
for (const ri of runins) { const o = await runOne(ri), a = analyse(o), key = String(o.speedTackler); out.speeds[key] = a;
  if (REC) L.writeGz(`${REC}/SP2A_${key}.json.gz`, o); console.log(key, a.hash, "cost", a.cost, JSON.stringify(a.costParts), "\n   first", JSON.stringify(a.firstContact), "\n   seam", JSON.stringify(a.transition.seam && a.transition.seam.maxPelvisDeltaW60ms), "momentum residual", JSON.stringify(a.momentumResidual)); }
const mid = runins.find(f => /4\.608|_5\.json/.test(f)) || runins[0], o2 = await runOne(mid), k5 = String(o2.speedTackler);
out.determinism = { speed: k5, first: out.speeds[k5].hash, repeat: o2.finalHash, identical: out.speeds[k5].hash === o2.finalHash };
fs.writeFileSync(`${OUT}/SP2A_eval.json`, JSON.stringify(out, null, 1)); console.log("determinism", JSON.stringify(out.determinism));
