// PPR-1 review data (read-only): compact per-step series for the review page's frame readout — A and B, PVP N2 / C0 and the rear shank impact.
// Per record: struck-leg joint angle changes (ankle_R df, knee_R flex, hip_R flex), pelvis / trunk tilt, runner activation max over the struck leg,
// actuator torque change at ankle_R / knee_R, per-foot ground reaction force, COM horizontal displacement.
// usage: node ppr1_review_data.mjs --dirA <battery A> --dirB <battery B> --out <json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const { metrics } = await import(new URL("./ppr1_metrics.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const out = { tool: "ppr1_review_data.mjs", runs: {} };
for (const [law, dir] of [["A", arg("dirA")], ["B", arg("dirB")]]) for (const id of ["N2", "C0", "IMP_shankR_back"]) {
  const m = metrics(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, `${law}_${id}.json.gz`))))), s = m.series, J = s.joints, r1 = (x) => +x.toFixed(2);
  const leg = ["ankle_R.df", "ankle_R.inv", "knee_R.flex", "hip_R.flex", "hip_R.abd"];
  out.runs[`${law}_${id === "IMP_shankR_back" ? "IMP" : id}`] = { n: s.t.map((_, q) => q + 1), ankle: J["ankle_R.df"].th.map(r1), knee: J["knee_R.flex"].th.map(r1), hip: J["hip_R.flex"].th.map(r1),
    pelvis: s.pelvis.map(p => r1(Math.hypot(p[0], p[1]))), trunk: s.thorax.map(p => r1(Math.hypot(p[0], p[1]))), act: s.t.map((_, q) => r1(Math.max(...leg.map(nm => J[nm].a[q] ?? 0)))),
    tauAnkle: J["ankle_R.df"].tau.map(x => r1(x - J["ankle_R.df"].tau[0])), tauKnee: J["knee_R.flex"].tau.map(x => r1(x - J["knee_R.flex"].tau[0])), F: s.F.map(f => f.map(x => Math.round(x))),
    com: s.com.map(c => r1(Math.hypot(c[0] - s.com[0][0], c[2] - s.com[0][2]) * 1000)) }; }
fs.writeFileSync(arg("out"), JSON.stringify(out)); console.log(Object.keys(out.runs).join(" "));
