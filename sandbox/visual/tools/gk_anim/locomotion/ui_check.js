const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-ui-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1500,height:1000}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/gk_anim_review.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>!!(window.GK_REVIEW&&S.pt&&S.pt.on&&S.gkAnim&&S.gkAnim.loaded));if(ok)break;await new Promise(r=>setTimeout(r,100));}
await new Promise(r=>setTimeout(r,800));
const out={};
for(const v of ["set:south-west","set:north-west","shuffle:west","shuffle:south-west","shuffle:north-west"]){ await p.evaluate((v)=>document.querySelector(`[data-loco="${v}"]`).click(),v); await new Promise(r=>setTimeout(r,500)); out[v]=await p.evaluate(()=>document.getElementById("rv-loco-read").textContent); }
await p.evaluate(()=>document.querySelector('[data-locoseq="west,north-west,west"]').click()); await new Promise(r=>setTimeout(r,1600)); out["seq W>NW>W after 1.6s"]=await p.evaluate(()=>document.getElementById("rv-loco-read").textContent);
const sec=await p.$("#rv-loco-read"); const box=await p.evaluate(()=>{ const h=[...document.querySelectorAll("h2")].find(h=>h.textContent.startsWith("Locomotion")); const r=h.parentElement.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
await p.screenshot({path:"review_loco_section.png",clip:{x:Math.max(0,box.x),y:Math.max(0,box.y),width:Math.min(1500,box.w),height:Math.min(400,box.h)}});
for(const k in out) console.log(k,"→",out[k]); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
