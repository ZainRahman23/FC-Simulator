// receive_kill1/tools/rk_review_check.cjs — every image, video, poster and local link of the review page resolves; a screenshot of its top
//   PUPPETEER_NODE_MODULES=<dir> node rk_review_check.cjs <screenshot.png> <profile dir>
const path = require("path"), p = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
(async () => { const [shot, prof] = process.argv.slice(2), b = await p.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof });
  const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 1000 }); await pg.goto("http://127.0.0.1:8361/review_artifacts/receive_kill1/review/RECEIVE_KILL1_REVIEW.html", { waitUntil: "networkidle0" });
  const r = await pg.evaluate(async () => { const bad = [], chk = async (u) => (await fetch(u, { method: "HEAD" })).ok, imgs = [...document.images], vids = [...document.querySelectorAll("video")], links = [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith("http://127.0.0.1"));
    for (const v of vids) { if (!(await chk(v.src))) bad.push(v.src); if (!(await chk(v.poster))) bad.push(v.poster); } for (const i of imgs) if (!(await chk(i.src))) bad.push(i.src); for (const h of links) if (!(await chk(h))) bad.push(h);
    return { images: imgs.length, videos: vids.length, links: links.length, bad }; });
  console.log(JSON.stringify(r)); await pg.screenshot({ path: shot }); await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
