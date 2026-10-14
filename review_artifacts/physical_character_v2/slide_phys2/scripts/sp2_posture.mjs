// SLIDE-PHYS-2: read a recorded posture (anatomical joint angles + pelvis pitch / roll / yaw in the sp_entry convention) from a record at time t —
// used to take physically realised postures (e.g. SP1's seated slide) as fixture templates. usage: node sp2_posture.mjs --rec r.json.gz --t 0.8
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export function postureAt(o, t, off = 0) { const r = o.recs.find(x => (x.t ?? 0) >= t - 1e-9) || o.recs[o.recs.length - 1], S = r.S.slice(off, off + B.length), an = L.anatOf(S), q = S[0].rot;
  // pelvis q = yaw(Y)·pitch(X)·roll(Z): forward axis f = q·z, up u = q·y
  const f = Q.rot(q, [0, 0, 1]), yaw = Math.atan2(f[0], f[2]), pitch = Math.asin(Math.max(-1, Math.min(1, -f[1]))), qy = L.axisQ([0, 1, 0], yaw * 180 / Math.PI), qp = L.axisQ([1, 0, 0], pitch * 180 / Math.PI);
  const qr = Q.mul(Q.conj(Q.mul(qy, qp)), q), roll = 2 * Math.atan2(qr[2], qr[3]);
  const round = (o2) => Object.fromEntries(Object.entries(o2).map(([j, v]) => [j, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Math.round(x * 10) / 10]))]));
  return { t: r.t, pelvis: { pitchDeg: +(pitch * 180 / Math.PI).toFixed(1), rollDeg: +(roll * 180 / Math.PI).toFixed(1), yawDeg: +(yaw * 180 / Math.PI).toFixed(1) }, anat: round(an), pelvisY: +S[0].pos[1].toFixed(3) }; }
if (process.argv[1] && process.argv[1].endsWith("sp2_posture.mjs")) { const o = L.readGz(arg("rec")); for (const t of arg("t", "0.8").split(",").map(Number)) console.log(JSON.stringify(postureAt(o, t))); }
