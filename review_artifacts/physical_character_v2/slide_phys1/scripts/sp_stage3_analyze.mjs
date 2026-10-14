// SLIDE-PHYS-1 Stage 3 analysis: each contact condition against the CALIB run (same world, same recipient, tackler 10 m clear = the recipient's
// unperturbed twin). Measured facts only; the outcome label is a label of those facts (SUPPORT-1 convention: FALL = recipient pelvis ≥ 0.15 m below
// its twin; DISPLACED-RECOVERED = a foot moved > 2 cm or the COM > 5 cm without a fall; ABSORBED otherwise). "Sliced-out signature" = the near foot
// is driven along the sweep (> 0.10 m) and loses the turf BEFORE the pelvis drops, and the recipient then falls — support taken from under the body,
// not a push of the upper body.
// usage (worktree root): node sp_stage3_analyze.mjs --dir <dir with CALIB/LIGHT/MODERATE/STRONG .json.gz> [--out summary.json]
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, D = arg("dir"), H = 1 / 240, r3 = (x) => Math.round(x * 1000) / 1000;
const sR = L.PL.SPEC_R(), nR = sR.bodies.length, ri = (n) => sR.bodies.findIndex(b => b.name === n), PEL = ri("pelvis"), FL = ri("foot_L"), FR = ri("foot_R"), HEAD = ri("head");
const TB = L.B.length, tb = (n) => nR + L.bi(n), sweep = [0, 0, -1];
const tw = L.readGz(arg("twin") || `${D}/CALIB.json.gz`), out = { tool: "sp_stage3_analyze.mjs", twin: { hash: tw.finalHash }, cases: {} };
const turfOf = (r, who, body) => r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && ((c.a[0] === who && c.a[1] === body) || (c.b[0] === who && c.b[1] === body)));
const footUp = (o, who, body, from) => { for (let k = from; k < o.recs.length; k++) { let up = true; for (let j = k; j < Math.min(k + 6, o.recs.length); j++) if (turfOf(o.recs[j], who, body)) { up = false; break; } if (up) return k; } return null; };
const CASES = arg("cases") ? arg("cases").split(",") : ["GRAZE", "LIGHT", "MODERATE", "STRONG"]; for (const cs of CASES) { const f = `${D}/${cs}.json.gz`; if (!fs.existsSync(f)) continue; const o = L.readGz(f), R = o.recs, A = o.activate, n = Math.min(R.length, tw.recs.length);
  const k0 = R.findIndex(r => r.contacts.some(c => c.kind === "cross" && c.Jn > 0)); if (k0 < 0) { out.cases[cs] = { contact: false, hash: o.finalHash }; continue; }
  let Jrec = [0, 0, 0], Fpk = 0, last = k0; const pairs = {}, recBodies = new Set();
  for (let k = k0; k < n; k++) for (const c of R[k].contacts) { if (c.kind !== "cross" || c.Jn <= 0) continue; const recSide = c.a[0] === "runner" ? c.a : c.b, tSide = c.a[0] === "runner" ? c.b : c.a;
    const key = recSide[1] + "×" + tSide[1]; pairs[key] = (pairs[key] || 0) + c.Jn; recBodies.add(recSide[1]); Fpk = Math.max(Fpk, c.Jn / H); last = k; Jrec = V.add(Jrec, V.sc(c.J2, c.b[0] === "runner" ? 1 : -1)); }
  // horizontal cross impulse on the recipient in the first 0.2 s of contact (the sweep pulse, comparable to SUPPORT-1's impulsive disturbances)
  let J02 = [0, 0, 0]; for (let k = k0; k < Math.min(n, k0 + 48); k++) for (const c of R[k].contacts) if (c.kind === "cross" && c.Jn > 0) J02 = V.add(J02, V.sc(c.J2, c.b[0] === "runner" ? 1 : -1)); const Jh02 = Math.hypot(J02[0], J02[2]);
  let fall = null, comPk = 0, footDisp = { L: 0, R: 0 }, footAlong = { L: 0, R: 0 }, pelDropEnd = 0, headT = null, vPk = 0;
  for (let k = k0; k < n; k++) { const r = R[k], t = tw.recs[k], drop = t.S[PEL].pos[1] - r.S[PEL].pos[1]; if (fall == null && drop > 0.15) fall = k;
    comPk = Math.max(comPk, V.len(V.sub([r.chars.runner.com[0], 0, r.chars.runner.com[2]], [t.chars.runner.com[0], 0, t.chars.runner.com[2]])));
    for (const [s, i] of [["L", FL], ["R", FR]]) { const d = V.sub(r.S[i].pos, t.S[i].pos); footDisp[s] = Math.max(footDisp[s], Math.hypot(d[0], d[2])); footAlong[s] = Math.max(footAlong[s], V.dot(d, sweep)); }
    const v = V.sc(r.chars.runner.P, 1 / 1); vPk = Math.max(vPk, Math.hypot(v[0], v[2])); if (headT == null && turfOf(r, "runner", "head")) headT = k; }
  pelDropEnd = tw.recs[n - 1].S[PEL].pos[1] - R[n - 1].S[PEL].pos[1];
  const upL = footUp(o, "runner", "foot_L", k0), upR = footUp(o, "runner", "foot_R", k0), Mr = sR.bodies.reduce((s, b) => s + b.mass, 0);
  const endD = V.sub(R[n - 1].chars.runner.com, tw.recs[n - 1].chars.runner.com), fallDir = Math.hypot(endD[0], endD[2]) > 0.05 ? V.dot([endD[0], 0, endD[2]], sweep) / Math.hypot(endD[0], endD[2]) : null;
  const cls = fall != null ? "FALL" : (Math.max(footDisp.L, footDisp.R) > 0.02 || comPk > 0.05 ? "DISPLACED-RECOVERED" : "ABSORBED");
  const sliced = fall != null && footAlong.L > 0.10 && upL != null && upL < fall;
  // tackler: ground travel after first contact vs the CALIB tackler over the same window, and its own state
  const tp = (o2, k) => o2.recs[Math.min(k, o2.recs.length - 1)].S[tb("pelvis")].pos, trav = (o2) => { const a = tp(o2, k0), b = tp(o2, n - 1); return Math.hypot(b[0] - a[0], b[2] - a[2]); };
  const tHead = R.findIndex((r, k) => k > A && turfOf(r, "tackler", "head")), tvAt = (k) => V.sc(R[k].chars.tackler.P, 1 / L.M);
  out.cases[cs] = { hash: o.finalHash, cond: o.cond, placement: o.placement, contact: true, firstContactS: r3((k0 - A) * H), firstPair: R[k0].contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => c.a[1] + "×" + c.b[1]),
    contactDurS: r3((last - k0) * H), crossImpulseOnRecipientNs: Jrec.map(r3), crossImpulseNs: r3(V.len(Jrec)), crossImpulseHorizNs: r3(Math.hypot(Jrec[0], Jrec[2])), crossImpulseAlongSweepNs: r3(V.dot(Jrec, sweep)), crossImpulseVertNs: r3(Jrec[1]), horizWithin02sNs: r3(Jh02), peakCrossForceN: Math.round(Fpk), peakCrossForceBW_rec: r3(Fpk / (Mr * 9.81)), impulseByPair: Object.fromEntries(Object.entries(pairs).map(([k, v]) => [k, r3(v)])),
    recipient: { cls, fallS: fall != null ? r3((fall - A) * H) : null, fallAfterContactS: fall != null ? r3((fall - k0) * H) : null, endPelvisDropM: r3(pelDropEnd), comDispPkM: r3(comPk), footDispPkM: { L: r3(footDisp.L), R: r3(footDisp.R) }, footAlongSweepPkM: { L: r3(footAlong.L), R: r3(footAlong.R) },
      footOffTurfS: { L: upL != null ? r3((upL - A) * H) : null, R: upR != null ? r3((upR - A) * H) : null }, headTurfS: headT != null ? r3((headT - A) * H) : null, fallDirAlongSweep: fallDir != null ? r3(fallDir) : null, slicedOutSignature: sliced },
    tackler: { vAtContact: tvAt(k0).map(r3), vhAtContact: r3(Math.hypot(tvAt(k0)[0], tvAt(k0)[2])), travelAfterContactM: r3(trav(o)), calibTravelSameWindowM: r3(trav(tw)), headTurfS: tHead > 0 ? r3((tHead - A) * H) : null },
    integrity: { maxHardExcDeg: r3(Math.max(...R.map(r => Math.max(r.chars.runner.integrity.hardExcDeg, r.chars.tackler.integrity.hardExcDeg)))), maxTurfPenMm: r3(Math.max(...R.map(r => Math.max(r.chars.runner.integrity.turfPenMm, r.chars.tackler.integrity.turfPenMm)))),
      eqOppMax: r3(Math.max(...R.map(r => r.eqOpp ? (r.eqOpp.maxRes ?? r.eqOpp.lin ?? 0) : 0))) }, cpuMs: o.cpu, wallMs: Math.round(o.wallMs) }; }
out.twin.recipientStanding = (() => { const R = tw.recs, p0 = R[0].S[PEL].pos[1], pe = R[R.length - 1].S[PEL].pos[1]; return { pelvisStartY: r3(p0), pelvisEndY: r3(pe) }; })();
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
