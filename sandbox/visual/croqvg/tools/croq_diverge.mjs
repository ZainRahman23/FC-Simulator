// croqvg/tools/croq_diverge.mjs — LA CROQUETA — VIDEO-GUIDED: where the intent torture's runs (v_intent_torture.mjs: seeded random joystick
// programs with a random MANUAL request every 1.2 – 2.6 s) first differ between this build and CURRENT (../../feint2ef, its own modules), against
// the time of each seed's first CROQUETA request — every difference must start at or after it (a croqueta of another length leaves another state
// for every request after it); a seed with no croqueta request must be identical throughout
//   node croq_diverge.mjs [--seeds 12] [--dur 60]
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 12), dur = +opt("dur", 60);
async function build(dir) { const b = new URL(dir, import.meta.url); const E = await import(new URL("tools/u_env.mjs", b)), C = await import(new URL("c_sim.js", b)), T = await import(new URL("tools/c_torture.mjs", b)), M = await import(new URL("v_meta.js", b));
  const POOL = M.META.filter((m) => m.kind !== "carry" && m.kind !== "none").map((m) => m.id);
  return (sd) => { const P = T.program(sd, dur), sim = E.makeSim("TL", Object.assign(JSON.parse(JSON.stringify(T.PAGE)), { layers: C.presetLayers("FULL"), pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B" }));
    let rng = sd * 7919, next = 2.0; const rand = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; }, reqs = [];
    for (let k = 0; k < Math.round(dur / E.DT); k++) { const t = k * E.DT; if (t >= next) { const id = POOL[Math.floor(rand() * POOL.length)]; sim.requestSkill(M.intentOf(id)); reqs.push([t, id]); next = t + 1.2 + 1.4 * rand(); } sim.step(P.req(t)); }
    return { reqs, cs: sim.contacts.map((c) => [+c.t.toFixed(4), c.F, c.surface, !!c.missed]) }; }; }
const A = await build("../"), B = await build("../../feint2ef/"); let ok = 0;
for (let sd = 1; sd <= seeds; sd++) { const a = A(sd), b = B(sd), tCq = (a.reqs.find((r) => r[1] === "CROQUETA") || [null])[0], sameReq = JSON.stringify(a.reqs.map((r) => r[1])) === JSON.stringify(b.reqs.map((r) => r[1]));
  let i = 0; while (i < a.cs.length && i < b.cs.length && JSON.stringify(a.cs[i]) === JSON.stringify(b.cs[i])) i++; const same = i === a.cs.length && i === b.cs.length, tDiv = same ? null : Math.min((a.cs[i] || [Infinity])[0], (b.cs[i] || [Infinity])[0]);
  const fine = same || (tCq != null && tDiv >= tCq - 1e-6); if (fine) ok++;
  console.log(`seed ${String(sd).padStart(2)} · requests identical ${sameReq} · first CROQUETA request ${tCq != null ? tCq.toFixed(2) + " s" : "none"} · contacts ${same ? `IDENTICAL (${a.cs.length})` : `first differ at ${tDiv.toFixed(2)} s (contact ${i} of ${a.cs.length} / ${b.cs.length})`} → ${fine ? "OK" : "DIFFERS BEFORE ANY CROQUETA"}`); }
console.log(`■ ${ok}/${seeds} seeds: identical, or identical until their first CROQUETA request`);
