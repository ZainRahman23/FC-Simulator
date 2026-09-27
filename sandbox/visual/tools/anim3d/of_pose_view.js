// Pose viewer (review tooling): renders named key poses on a real character, lowered onto the pitch by its lowest point, from
// side / front / three-quarter / top, into one grid per pose.   node of_pose_view.js --poses poses.json --out dir [--char gabriel]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const POSES = JSON.parse(fs.readFileSync(opt("--poses"))), OUT = opt("--out", "pose_view"), CHAR = opt("--char", "gabriel");
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-poseview"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto("http://127.0.0.1:8124/sandbox/visual/match.html?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const out = await p.evaluate(async (POSES, CHAR) => {
    S.pt.paused = true; const ent = await ofCharLoad(CHAR), sk = ent.skel, res = {};
    const render = (fk, skin, eye, tgt, W, H) => {
      const f = V3.norm(V3.sub(tgt, eye)), r = V3.norm(V3.cross(f, [0, 1, 0])), u = V3.cross(r, f), view = M4.ident();
      view[0] = r[0]; view[4] = r[1]; view[8] = r[2]; view[1] = u[0]; view[5] = u[1]; view[9] = u[2]; view[2] = -f[0]; view[6] = -f[1]; view[10] = -f[2]; view[12] = -V3.dot(r, eye); view[13] = -V3.dot(u, eye); view[14] = V3.dot(f, eye);
      const t = 1 / Math.tan(40 * Math.PI / 360), N = 0.05, F = 60, proj = new Float32Array(16); proj[0] = t * H / W; proj[5] = t; proj[10] = -(F + N) / (F - N); proj[11] = -1; proj[14] = -2 * F * N / (F - N);
      const _c = glCamera; glCamera = () => ({ view, proj }); const pg = GL3D.pixelScale, prev = GL3D.character; GL3D.pixelScale = 1; GL3D.character = "SKINNED";
      try { const rs = glRenderCharacters(OFPLAY.R, [{ skel: sk, fk, skinMats: skin, palette: OFPLAY_KIT_B, char: ent }], W, H, {});
        const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.fillStyle = "#3f7f32"; g.fillRect(0, 0, W, H);
        const P = (x, y, z) => { const e = M4.transformPoint(view, [x, y, z]); if (e[2] > -0.05) return null; return [W / 2 + (proj[0] * e[0] / -e[2]) * W / 2, H / 2 - (proj[5] * e[1] / -e[2]) * H / 2]; };
        g.strokeStyle = "rgba(255,255,255,0.3)"; for (let k = -3; k <= 3; k++) for (const [A, B] of [[[k, 0, -3], [k, 0, 3]], [[-3, 0, k], [3, 0, k]]]) { const pa = P(...A), pb = P(...B); if (pa && pb) { g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.stroke(); } }
        g.strokeStyle = "#ffe36a"; g.lineWidth = 2; const o = P(0, 0, 0), fw = P(0.6, 0, 0); if (o && fw) { g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(fw[0], fw[1]); g.stroke(); }   // the travel direction (+x)
        g.drawImage(rs.canvas, 0, rs.canvas.height - rs.h, rs.w, rs.h, 0, 0, W, H); return c.toDataURL("image/png"); }
      finally { glCamera = _c; GL3D.pixelScale = pg; GL3D.character = prev; } };
    for (const name in POSES) {
      const P0 = POSES[name], rootM = gkRootMatrix(0, 0, 0, 0), pel = sk.byName.pelvis, base = pel.off.slice();
      let fk = skelFK(sk, P0, rootM), minY = 1e9;
      for (const bn of sk.bones) { if (!bn.part || bn.name === "root" || bn.name === "hair" || /^(hand|foreArm|upperArm|clavicle)_/.test(bn.name)) continue; const v = Math.min(fk.joint[bn.idx][1], fk.tip[bn.idx][1]) - (/^(foot|toe)_/.test(bn.name) ? 0.01 : bn.rad * 0.6); if (v < minY) minY = v; }
      pel.off = [base[0], base[1] - (minY - 0.012), base[2]]; fk = skelFK(sk, P0, rootM); pel.off = base;
      const skin = new Float32Array(sk.bones.length * 16); skelSkinMatrices(sk, fk, sk.invBind).forEach((m, i) => skin.set(m, i * 16));
      const T = [0.05, 0.35, 0], D = 3.0, cams = { side: [0.05, 0.9, -D], front: [D, 0.9, 0], tq: [D * 0.7, 1.4, -D * 0.7], top: [0.06, D * 1.3, 0] };
      res[name] = {}; for (const v in cams) res[name][v] = render(fk, skin, cams[v], v === "top" ? [0.05, 0, 0] : T, 300, 300);
    }
    return res;
  }, POSES, CHAR);
  for (const n in out) for (const v in out[n]) fs.writeFileSync(path.join(OUT, `${n}_${v}.png`), Buffer.from(out[n][v].split(",")[1], "base64"));
  console.log("ok", Object.keys(out).length, "errors", errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
