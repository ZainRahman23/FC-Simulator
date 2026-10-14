// SLIDE-PHYS-2: pitch / roll angular momentum about the COM through a solo record, with the turf angular impulse that changed it (per body group)
// and the plant foot's ground reaction (where it acts relative to the COM). + pitch = BACKWARD (sit-back), + roll = toward the LEFT (fold) side.
// usage: node sp2_pitch.mjs --rec r.json.gz [--to 0.6] [--every 6]
const R = await import(new URL("./sp2_regions.mjs", import.meta.url).href), { L } = R, { V, Q, B, M, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const o = L.readGz(arg("rec")), recs = o.recs, P0 = recs[0].chars.tackler.P, dir = V.norm([P0[0], 0, P0[2]]), lat = V.cross(dir, [0, 1, 0]);   // lat = dir × up: + about lat = backward pitch
const Lc = (r) => { const c = r.chars.tackler; return V.sub(c.L_O, V.cross(c.com, c.P)); }, to = +arg("to", "0.6"), ev = +arg("every", "6");
let acc = {}; console.log("t      Lpitch  Lroll | turf angular impulse since last row (pitch) by group | plant-foot GRF: Fy(BW) Fh(BW) CoP ahead of COM (m)");
for (let k = 1; k < recs.length && recs[k].t <= to; k++) { const r = recs[k], com = r.chars.tackler.com, cs = R.turfContacts(r, recs[k - 1].S, "tackler", 0, o.contactRule || o.soleRule);
  for (const c of cs) { const H = V.cross(V.sub(c.p, com), c.J); acc[c.group] = (acc[c.group] || 0) + V.dot(H, lat); }
  if (k % ev === 0) { const Lr = Lc(r), fb = cs.filter(c => c.group === "foldBoot"), Fy = fb.reduce((s, c) => s + c.J[1], 0) * 240 / (M * 9.81), Fh = fb.reduce((s, c) => s + V.dot(c.J, dir), 0) * 240 / (M * 9.81);
    const cop = fb.length ? V.dot(V.sub(V.sc(fb.reduce((s, c) => V.add(s, V.sc(c.p, c.Jn)), [0, 0, 0]), 1 / Math.max(1e-9, fb.reduce((s, c) => s + c.Jn, 0))), com), dir) : null;
    console.log(r.t.toFixed(3), V.dot(Lr, lat).toFixed(1).padStart(7), V.dot(Lr, dir).toFixed(1).padStart(6), "|", Object.entries(acc).map(([g, x]) => `${g} ${x.toFixed(1)}`).join(" ").padEnd(50), "|", fb.length ? `${Fy.toFixed(2)} ${Fh.toFixed(2)} ${cop.toFixed(3)}` : ""); acc = {}; } }
