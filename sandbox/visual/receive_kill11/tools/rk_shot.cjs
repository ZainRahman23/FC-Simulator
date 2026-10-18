// receive_kill11/tools/rk_shot.cjs — screenshot a page once its ready flag is set:
//   PUPPETEER_NODE_MODULES=<dir> node rk_shot.cjs <url> <out.png> [readyFlag=RKM_READY] [width=1500] [height=1000] [fullPage=1] [profile dir]
const path = require("path"), puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
(async () => {
  const [url, out, flag = "RKM_READY", w = "1500", h = "1000", full = "1", prof] = process.argv.slice(2);
  const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"], userDataDir: prof || undefined });
  const page = await browser.newPage(); await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  const logs = []; page.on("console", (m) => logs.push(m.type() + ": " + m.text())); page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction((f) => window[f] === true, { timeout: 180000, polling: 200 }, flag).catch((e) => logs.push("timeout waiting for " + flag));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: out, fullPage: full === "1" });
  const errs = logs.filter((l) => /error/i.test(l)); if (errs.length) console.log(errs.slice(0, 10).join("\n"));
  console.log("saved", out); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
