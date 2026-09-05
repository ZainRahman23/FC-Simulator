// READINESS PRESENTATION capture on the review override (same living-bob logic and constants as the live IDLE path, one shared clock):
// mode idle (base + bob) / set (hold) / setflex (SET + candidate rise frame) for W / SW / NW, 36 frames × 0.1 s = one 3.6 s cycle, identical phase.
// node ready_capture.js <outdir> <mode>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"ready"; const MODE=process.argv[3]||"idle"; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-ready-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/gk_anim_review.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>!!(window.GK_REVIEW&&S.pt&&S.pt.on&&S.gkAnim&&S.gkAnim.loaded));if(ok)break;await new Promise(r=>setTimeout(r,100));}
await new Promise(r=>setTimeout(r,600));
await p.evaluate(()=>{ S.pt.paused=true; S.dbg.anim=false; RIG.mode="manual"; RIG.manualX=102.2; RIG.targetX=102.2; RIG.x=102.2; RIG.zoom=2.990127635821332; RIG.zoomTarget=RIG.zoom; });
const rec={};
for(const d of ["west","south-west","north-west"]){
  rec[d]=[];
  for(let k=0;k<36;k++){
    const info=await p.evaluate((d,k,MODE)=>{ const clock=k*0.1; const st=MODE==="idle"?"base":"set"; const living=MODE!=="set"; const flex=MODE==="setflex";
      GK_ANIM.reviewOverride={kind:"state", state:st, dir:d, living, flex, clock, showLabel:false}; const g=S.pt.gk; const q=sproj3(g.x,0,g.y); const phase=living?(0.5-0.5*Math.cos(2*Math.PI*clock/GK_ANIM.idleBobPeriod)):0;
      return {sp:[Math.round(q.x),Math.round(q.y)], clock, phase:+phase.toFixed(2), dy:living?Math.round(GK_ANIM.idleBobPx*phase):0, flexFrame:!!(flex&&S.gkAnim.states.readyRise&&S.gkAnim.states.readyRise[d]&&phase>=0.5)}; },d,k,MODE);
    await new Promise(r=>setTimeout(r,60));
    const clip={x:info.sp[0]-110,y:info.sp[1]-150,width:220,height:200}; const f=path.join(OUT,`${d}_${String(k).padStart(2,"0")}.png`); await p.screenshot({path:f,clip}); rec[d].push({file:path.basename(f),root:[110,150],...info});
  }
  console.log(MODE,d,"dy",rec[d].map(f=>f.dy).join(""),"flex",rec[d].map(f=>f.flexFrame?1:0).join(""));
}
fs.writeFileSync(path.join(OUT,"ready.json"),JSON.stringify({mode:MODE,rec,errors:errs},null,1)); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
