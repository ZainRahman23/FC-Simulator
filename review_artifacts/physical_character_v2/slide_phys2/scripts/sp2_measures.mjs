// SLIDE-PHYS-2 measures of a solo record (fixture or full tackle): ground-contact sequence by body region, per-region loads (impulse, per-step
// peak, and the 29 ms (7-step) moving-window peak — the quantity comparable with force-plate data, since a rigid contact concentrates an impact
// into a few 4 ms steps that soft tissue spreads over ≈ 30 ms), horizontal braking per region, COM speed profile, momentum retention, slide
// distance and deceleration, tackling-boot clearance and sole orientation, posture (belly normal, recline), head contact.
const R = await import(new URL("./sp2_regions.mjs", import.meta.url).href), { L } = R, { V, Q, B, M, G, bi } = L;
const H = 1 / 240, BW = M * G, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
export function measure(o, opts = {}) { const recs = o.recs, role = opts.role || "tackler", off = opts.bOff || 0, rule = o.contactRule || o.soleRule || null, tOf = (r, k) => r.t ?? (k + 1) * H;
  const ch = (r) => r.chars[role], P0 = ch(recs[0]).P, dir = V.norm([P0[0], 0, P0[2]]);
  const groups = {}, seq = [], series = []; let firstBody = null, firstAny = null, headT = null;
  const fR = bi("foot_R"), tbClear = []; let minBelly = 1, reclMax = -90;
  for (let k = 0; k < recs.length; k++) { const r = recs[k], t = tOf(r, k), S = r.S.slice(off, off + B.length), Spre = (recs[k - 1] || r).S, cs = R.turfContacts(r, Spre, role, off, rule);
    const perG = {}; for (const c of cs) { const g = c.group, e = groups[g] || (groups[g] = { Jn: 0, brake: 0, first: null, peakStepBW: 0, peakStepT: null, series: [], regions: {} });
      e.Jn += c.Jn; e.brake += -V.dot(c.J, dir); e.regions[c.region] = (e.regions[c.region] || 0) + c.Jn; perG[g] = (perG[g] || 0) + c.Jn;
      if (c.Jn > 0 && e.first == null) { e.first = t; seq.push([g, r3(t)]); } if (c.Jn > 0 && firstAny == null) firstAny = t; if (c.Jn > 0 && firstBody == null && !g.endsWith("Boot")) firstBody = t; if (c.group === "head" && c.Jn > 0 && headT == null) headT = t; }
    for (const g of Object.keys(groups)) { const F = (perG[g] || 0) / H / BW; groups[g].series.push(F); if (F > groups[g].peakStepBW) { groups[g].peakStepBW = F; groups[g].peakStepT = t; } }
    const c = ch(r), v = V.sc(c.P, 1 / M), vh = V.dot(v, dir), pel = S[0], th = S[bi("thorax")], belly = Q.rot(pel.rot, [0, 0, 1])[1], up = Q.rot(th.rot, [0, 1, 0]), recl = Math.atan2(-V.dot(up, dir), up[1]) * 180 / Math.PI;
    minBelly = Math.min(minBelly, belly); const f = S[fR], low = L.PL.bodyLowest(B[fR], f).y, sole = -Q.rot(f.rot, [0, -1, 0])[1];
    series.push({ t: r3(t), vh: r3(vh), vy: r3(v[1]), comY: r3(c.com[1]), pelY: r3(pel.pos[1]), recl: r3(recl), belly: r3(belly), bootLow: r3(low), bootSoleDownCos: r3(sole), comXZ: [c.com[0], c.com[2]] }); }
  // moving-window (7 steps ≈ 29 ms) peak per group, aligned to the step counts of each group's series (groups appear late: left-pad)
  const n = recs.length; for (const e of Object.values(groups)) { const s = Array(n - e.series.length).fill(0).concat(e.series); let best = 0, bt = null; for (let k = 6; k < n; k++) { let m = 0; for (let j = k - 6; j <= k; j++) m += s[j]; m /= 7; if (m > best) { best = m; bt = k; } } e.peak29msBW = best; e.peak29msT = bt != null ? tOf(recs[bt], bt) : null; delete e.series; }
  const at = (t) => series.find(x => x.t >= t - 1e-9) || series[series.length - 1], tb = firstBody ?? firstAny ?? 0, e0 = at(tb), stop = series.find(x => x.t > tb && x.vh < 0.3);
  const dist = (a, b) => Math.hypot(b.comXZ[0] - a.comXZ[0], b.comXZ[1] - a.comXZ[1]), end = stop || series[series.length - 1];
  const glide = series.filter(x => x.t >= tb && x.t <= (stop ? stop.t : 1e9)), bootGlide = glide.map(x => x.bootLow), bootContactFrac = (() => { let nb = 0; for (const x of glide) if (x.bootLow < 0.003) nb++; return glide.length ? nb / glide.length : null; })();
  const retention = Object.fromEntries([0.1, 0.2, 0.3, 0.5].map(d => [`+${d}s`, r3(at(tb + d).vh / Math.max(1e-6, e0.vh))]));
  // glide-phase load share per group (from first body contact + 0.15 s, the measured impact-phase length, to the stop): who carries the slide
  const gl = {}; { const tA = (firstBody ?? 0) + 0.15, tB = stop ? stop.t : 1e9; for (let k = 0; k < recs.length; k++) { const r = recs[k], t = tOf(r, k); if (t < tA || t > tB) continue; for (const c of R.turfContacts(r, (recs[k - 1] || r).S, role, off, rule)) gl[c.group] = (gl[c.group] || 0) + c.Jn; } }
  const glSum = Object.values(gl).reduce((s, x) => s + x, 0) || 1;
  const sumJn = Object.values(groups).reduce((s, e) => s + e.Jn, 0), sumBrake = Object.values(groups).reduce((s, e) => s + e.brake, 0);
  const out = { hash: o.finalHash, steps: recs.length, firstAnyT: r3(firstAny), firstBodyT: r3(firstBody), sequence: seq,
    atFirstBody: { vh: e0.vh, vy: e0.vy, comY: e0.comY, pelY: e0.pelY }, retention, stopT: stop ? stop.t : null, slideDistM: r3(dist(e0, end)), meanDecel: stop ? r3((e0.vh - stop.vh) / Math.max(1e-6, stop.t - e0.t)) : r3((e0.vh - end.vh) / Math.max(1e-6, end.t - e0.t)),
    groups: Object.fromEntries(Object.entries(groups).sort((a, b) => b[1].Jn - a[1].Jn).map(([g, e]) => [g, { first: r3(e.first), JnNs: r3(e.Jn), shareJn: r3(e.Jn / sumJn), brakeNs: r3(e.brake), shareBrake: r3(e.brake / sumBrake), peakStepBW: r3(e.peakStepBW), peak29msBW: r3(e.peak29msBW), peak29msT: r3(e.peak29msT), regions: Object.fromEntries(Object.entries(e.regions).map(([k, v]) => [k, r3(v)])) }])),
    tacklingBoot: { minLowDuringGlideM: r3(Math.min(...bootGlide)), meanLowDuringGlideM: r3(bootGlide.reduce((s, x) => s + x, 0) / Math.max(1, bootGlide.length)), contactFracDuringGlide: r3(bootContactFrac), JnNs: r3(groups.tackBoot ? groups.tackBoot.Jn : 0), shareJn: r3(groups.tackBoot ? groups.tackBoot.Jn / sumJn : 0) },
    glideShare: Object.fromEntries(Object.entries(gl).sort((a, b) => b[1] - a[1]).map(([g, x]) => [g, r3(x / glSum)])),
    posture: { minBellyY: r3(minBelly), reclAtStop: stop ? stop.recl : null, headTurfT: r3(headT) }, series };
  return out; }
export const brief = (m) => `first ${m.firstBodyT} glide[${Object.entries(m.glideShare || {}).slice(0, 4).map(([g, x]) => g + ' ' + x).join(', ')}] [${m.sequence.slice(0, 7).map(([g, t]) => g + "@" + t).join(" ")}] vh0 ${m.atFirstBody.vh} vy0 ${m.atFirstBody.vy} | ret ${Object.values(m.retention).join("/")} | slide ${m.slideDistM} m stop ${m.stopT} decel ${m.meanDecel} | boot low ${m.tacklingBoot.minLowDuringGlideM} cf ${m.tacklingBoot.contactFracDuringGlide} J ${m.tacklingBoot.JnNs} | belly ${m.posture.minBellyY} head ${m.posture.headTurfT}\n   loads: ${Object.entries(m.groups).slice(0, 6).map(([g, e]) => `${g} ${e.JnNs}N·s pk${e.peak29msBW}BW(29ms)/${e.peakStepBW}`).join(" · ")}`;
