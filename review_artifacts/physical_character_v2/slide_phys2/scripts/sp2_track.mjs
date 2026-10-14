// SLIDE-PHYS-2: timeline of chosen joint angles (actual vs choreography target), pelvis pitch / roll, COM height, tackling-boot height — to see
// where a candidate departs from its intent. usage: node sp2_track.mjs --rec r.json.gz --cand H1 [--speed 5] [--every 12] [--joints hip_R.flex,knee_R.flex]
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), C = await import(S1 + "sp_chor.mjs"), { V, Q, B, bi } = L;
const CN = await import(new URL("./sp2_cand.mjs", import.meta.url).href), PO = await import(new URL("./sp2_posture.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const o = L.readGz(arg("rec")), cand = CN.make(arg("cand"), +arg("speed", "5")), ch = C.compile(cand.chor), js = arg("joints", "hip_R.flex,knee_R.flex,hip_L.flex,knee_L.flex,lumbar.flex").split(","), ev = +arg("every", "12");
for (let k = 0; k < o.recs.length; k += ev) { const r = o.recs[k], t = r.t, an = L.anatOf(r.S.slice(0, B.length)), tg = ch.anatAt(t), po = PO.postureAt(o, t), f = r.S[bi("foot_R")];
  console.log(t.toFixed(3), js.map(j => { const [a, b] = j.split("."); return `${j} ${an[a][b].toFixed(0)}/${(tg[a] && tg[a][b] != null ? tg[a][b] : NaN).toFixed(0)}`; }).join("  "), `| pel p${po.pelvis.pitchDeg} r${po.pelvis.rollDeg} y${po.pelvisY}`, `| com ${r.chars.tackler.com[1].toFixed(2)} boot ${L.PL.bodyLowest(B[bi("foot_R")], f).y.toFixed(3)}`); }
