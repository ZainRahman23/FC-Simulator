const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-ui2-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1500,height:1000}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/gk_anim_review.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>!!(window.GK_REVIEW&&S.pt&&S.pt.on&&S.gkAnim&&S.gkAnim.loaded));if(ok)break;await new Promise(r=>setTimeout(r,100));}
await new Promise(r=>setTimeout(r,800)); const out={};
for(const v of ["idle:west","idle:south-west","idle:north-west","set:west"]){ await p.evaluate((v)=>document.querySelector(`[data-loco="${v}"]`).click(),v); await new Promise(r=>setTimeout(r,400)); out[v]=await p.evaluate(()=>({read:document.getElementById("rv-loco-read").textContent, ov:(({kind,state,dir,living,flex,clock})=>({kind,state,dir,living,flex,clock:+clock.toFixed(2)}))(GK_ANIM.reviewOverride)})); }
// phase continuity across a facing change: clock must keep running, not reset
await p.evaluate(()=>document.querySelector('[data-loco="idle:west"]').click()); await new Promise(r=>setTimeout(r,1500)); const c1=await p.evaluate(()=>GK_ANIM.reviewOverride.clock);
await p.evaluate(()=>document.querySelector('[data-loco="idle:south-west"]').click()); await new Promise(r=>setTimeout(r,100)); const c2=await p.evaluate(()=>GK_ANIM.reviewOverride.clock);
out.phaseContinuity={clockBeforeSwitch:+c1.toFixed(2), clockAfterSwitch:+c2.toFixed(2), reset:(c2<c1)};
await p.evaluate(()=>document.querySelector('[data-locoseq="west,north-west,west"]').click()); await p.evaluate(()=>{ document.getElementById("rv-loco-shuffle").checked=false; document.querySelector('[data-locoseq="west,north-west,west"]').click(); }); await new Promise(r=>setTimeout(r,1000)); out.seqIdle=await p.evaluate(()=>document.getElementById("rv-loco-read").textContent);
const box=await p.evaluate(()=>{ const h=[...document.querySelectorAll("h2")].find(h=>h.textContent.startsWith("Locomotion")); const r=h.parentElement.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
await p.screenshot({path:"review_loco_section2.png",clip:{x:Math.max(0,box.x),y:Math.max(0,box.y),width:Math.min(1500,box.w),height:Math.min(420,box.h)}});
for(const k in out) console.log(k,"→",JSON.stringify(out[k])); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
