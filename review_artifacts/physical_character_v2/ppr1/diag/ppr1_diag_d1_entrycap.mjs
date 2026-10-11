// PPR-1 POST-HOC DIAGNOSTIC D1 (labelled; NOT B, NOT adopted, NOT a successor run): tests the diagnosed cause of B's H1 / H2 / H3 / PR3 failures —
// B's excitation divides the (collision-blind) drive by the CURRENT-angle isometric capacity capIso(θ_n), so activation follows joint motion with
// zero latency. D1 = B with exactly ONE change: the excitation is normalised by the ENTRY capacity (constant): u± = max(±τ_drive, 0)/capIso±(entry) + a_cc.
// Everything else — the drive, intrinsic K_i from the activation in effect × the current force–length capacity, D_i, the yield window, the anchors —
// is B's code unchanged (subclasses; the frozen ppr1_law.mjs is not edited). Runs: QS (runner alone, 4 s), C0, N2 (PVP-1A-DX). No visuals.
// usage: V2_KNEE_MODEL=v2k node ppr1_diag_d1_entrycap.mjs --fixture <PVP1A_FIXTURE.json> --dir <out dir>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q, P2 } = PL;
const L = await import(new URL("../scripts/ppr1_law.mjs", import.meta.url).href), { runOne } = await import(new URL("../scripts/ppr1_run.mjs", import.meta.url).href);
const { activationStep } = await import(P2 + "spec/v2_actuators.js"), { ACT } = await import(P2 + "sim/v2_actuation.js"), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], KEYS = ["x", "y", "z"];
class D1Actuator extends L.PreReflexActuator {   // B's PreReflexActuator.compute, except u± uses c.isoExc (the entry capacities)
  compute(st, ev, cmd, dt, init = false) {
    st = unitStates(st); ev = unitEv(ev); const P = this.P, out = [], zeta = this.pp.zeta, aCC = this.pp.aCC;
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w);
      const kneeDeg = this.kneeOf[k] != null ? P.anat(P.jd[this.kneeOf[k]], ev.qs[this.kneeOf[k]], "flex") : null;
      const rows = KEYS.map((key, i) => { const x = this.ax[k][i]; if (!x) return null; const c = cmd[k] && cmd[k][i]; if (!c) return { off: true };
        const w = V.dot(wrel, axW[i]), anat = P.anat(d, ev.qs[k], x.key), isoP = this.capFull(x, 1, anat, 0, kneeDeg), isoM = this.capFull(x, -1, anat, 0, kneeDeg);
        const capP = this.capFull(x, 1, anat, w, kneeDeg), capM = this.capFull(x, -1, anat, -w, kneeDeg);
        const uP = Math.min(1, Math.max(c.drive, 0) / Math.max(1e-9, c.isoExc[0]) + aCC), uM = Math.min(1, Math.max(-c.drive, 0) / Math.max(1e-9, c.isoExc[1]) + aCC);   // ← the one change
        const a = this.a[k][i]; if (init) { a[0] = uP; a[1] = uM; } else { a[0] = activationStep(a[0], uP, dt); a[1] = activationStep(a[1], uM, dt); }
        const K = c.kP * a[0] * isoP + c.kM * a[1] * isoM, D = Math.max(ACT.D_MIN, 2 * zeta * Math.sqrt(K * c.I)), tau0 = c.drive + K * c.eAnc, req = tau0 - (D + dt * K) * w;
        return { K, D, tau0, req, capP, capM, hi: a[0] * capP, lo: -a[1] * capM, w, anat, drive: c.drive, uP, uM }; });
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false }); } }
class D1Law extends L.PreReflexLaw {
  constructor(plant, c, params) { super(plant, c, params); const old = c.act; c.act = new D1Actuator(c.spec, c.view, c.P, params); c.overCap0 = 0;
    const P = c.P, ev = c.up.ev; this.iso0 = this.ax.map(a => { const kneeK = old.kneeOf[a.k], kneeDeg = kneeK != null ? P.anat(P.jd[kneeK], ev.qs[kneeK], "flex") : null;
      return [0, 1, 2].map(i => { const x = old.ax[a.k][i]; if (!x || !a.rows[i]) return null; const anat = P.anat(P.jd[a.k], ev.qs[a.k], x.key); return [old.capFull(x, 1, anat, 0, kneeDeg), old.capFull(x, -1, anat, 0, kneeDeg)]; }); }); }
  command(c, st, ev, n) { const out = super.command(c, st, ev, n); this.ax.forEach((a, j) => { if (!out.cmd[a.k]) return; out.cmd[a.k].forEach((r, i) => { if (r) r.isoExc = this.iso0[j][i]; }); }); return out; } }
// D2 / D3 (QS only, same file, --variant): D2 = D1 with the regulator delay L = 0 (is the 125 ms latency what makes standing fail?);
// D3 = D1 without the plastic anchor slip (is the memory-less yield what loses posture?). Each is one change from D1.
class D3Law extends D1Law { after() {} }
const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), dir = arg("dir"), variant = arg("variant", "D1"); fs.mkdirSync(dir, { recursive: true });
if (variant !== "D1") { const lawF = variant === "D2" ? (p, c) => new D1Law(p, c, { ...L.PPR1_B, L: 0 }) : (p, c) => new D3Law(p, c, L.PPR1_B);
  const o = await runOne({ fixtureObj: FIX, law: "B", scene: "SOLO", steps: 960, label: variant + "_QS", lawFactory: lawF }); o.job.law = variant;
  fs.writeFileSync(path.join(dir, `${variant}_QS.json.gz`), zlib.gzipSync(JSON.stringify(o))); console.log(variant, "QS", o.recs.length, o.finalHash); process.exit(0); }
for (const [id, scene, steps] of [["QS", "SOLO", 960], ["C0", "C0", 260], ["N2", "N2", 260]]) { const o = await runOne({ fixtureObj: FIX, law: "B", scene, steps, label: "D1_" + id, lawFactory: (p, c) => new D1Law(p, c, L.PPR1_B) });
  o.job.law = "D1"; fs.writeFileSync(path.join(dir, `D1_${id}.json.gz`), zlib.gzipSync(JSON.stringify(o))); console.log("D1", id, o.recs.length, o.finalHash, o.stop ? "STOP " + o.stop.reason : ""); }
