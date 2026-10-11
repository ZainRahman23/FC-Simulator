// ABI-1 S-IMPACT cross-level summary (descriptive; physical quantities only; never mapped to gameplay labels). Per level and condition: first contact,
// cross impulse over W1, runner COM Δv at the W1 end, support transitions, first XcoM-outside-BoS step, windows, physical response types (W1 and EXT),
// visibility of B−A / C−A, step events (C), and EXT end state (COM drop, thorax tilt, XcoM margin).
// usage: V2_KNEE_MODEL=v2k node abi1_impact_summary.mjs <impact runs dir> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const MT = await import(new URL("./abi1_metrics.mjs", import.meta.url).href), PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V } = PL;
const num = (x) => (typeof x === "number" && isFinite(x) ? +x.toFixed(2) : null), [D, OUTF] = process.argv.slice(2), X = MT.runnerCtx(), L = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(D, f)))), levels = ["0.25", "0.5", "0.75", "1.0", "1.25", "1.5", "2.0"], out = { tool: "abi1_impact_summary.mjs", levels: {} };
for (const v of levels) { const ev = JSON.parse(fs.readFileSync(path.join(D, `ABI1_EVAL_S-IMPACT_V${v}.json`))), row = { conds: {} };
  for (const c of ["A", "B", "C"]) { const r = {}; for (const cs of ["ALL", "LEGS"]) { const k = `${c}_N2_${cs}`, o = L(`V${v}_${k}.json.gz`), rows = MT.analyze(o), w = ev.windows[k], m = ev.metrics[k], t = ev.timeline[k];
      const vEnd = rows[Math.min(w.end, rows.length) - 1].v, v0 = MT.comOf(o.recs[0].S.slice(0, X.nb), X.B).v;
      r[cs] = { window: w.end, windowReason: w.reason, type: ev.types[k].type, firstContact: ev.contact[k].firstContactStep, crossJ: +Object.values(ev.contact[k].pairs).reduce((s, p) => s + p.J, 0).toFixed(2),
        pairs: Object.keys(ev.contact[k].pairs), runnerDv: V.sub(vEnd, v0).map(x => +x.toFixed(3)), support: t.support.map(s => s.foot + (s.to === "OFF" ? "↑" : "↓") + s.n), firstOut: t.firstXcomOutsideBoS,
        steps: (t.stepEvents || []).map(s => s.phase[0] + s.n), atEnd: { dOut: +m.atEnd.dOut.toFixed(3), comDrop: +m.atEnd.comDrop.toFixed(3), thoTilt: +m.atEnd.thoTilt.toFixed(1), pelTilt: +m.atEnd.pelTilt.toFixed(1) },
        tacklerDv: ev.tackler[k].dvWindow.map(x => +x.toFixed(2)) }; }
    row.conds[c] = r; }
  row.E1 = Object.fromEntries(Object.entries(ev.effects).map(([k, e]) => [k, { cls: e.E1.class, maxPx: num(e.E1.maxPx), byGroup: Object.fromEntries(Object.entries(e.E1.maxPxByGroup).map(([g, x]) => [g, num(x)])), window: e.window }]));
  out.levels[v] = row;
  console.log(`v×${v}: A ${row.conds.A.ALL.type}/${row.conds.A.LEGS.type} · B ${row.conds.B.LEGS.type} · C ${row.conds.C.LEGS.type} [${row.conds.C.LEGS.steps.join(" ")}] · crossJ(W1) ${row.conds.A.ALL.crossJ} · runner Δv(W1) ${row.conds.A.ALL.runnerDv} · support A ${row.conds.A.LEGS.support.join(" ")} · B−A W1 ${row.E1["B-A_ALL"].maxPx} px, EXT ${row.E1["B-A_LEGS"].maxPx} px · EXT end tilt A/B/C ${row.conds.A.LEGS.atEnd.thoTilt}/${row.conds.B.LEGS.atEnd.thoTilt}/${row.conds.C.LEGS.atEnd.thoTilt}°`); }
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
