// TWO-DIRECTION DECISION MATRIX (V1.2 Phase 18): GOAL_LEFT and GOAL_RIGHT × 4 heights × 3 laterals, goal-line synthetic arrivals
// through the real simulation on the review page (facing W held constant). node matrix2_run.js <outdir> [speed=24]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"matrix2"; const V=+(process.argv[3]||24); fs.mkdirSync(OUT,{recursive:true});
const LATS=[["SMALL",0.4],["MED",1.2],["LARGE",2.0]], ZS=[["LOW",0.3],["MID",1.0],["HIGH",1.7],["TOP",2.2]];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-matrix2",args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1500,height:900}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/gk_anim_review.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>!!(window.GK_REVIEW&&S.pt&&S.pt.on));if(ok)break;await new Promise(r=>setTimeout(r,100));}
await new Promise(r=>setTimeout(r,800));
const matrix=[];
for(const side of ["GOAL_LEFT","GOAL_RIGHT"]) for(const [ln,lat] of LATS) for(const [zn,z] of ZS){
  const laty=side==="GOAL_LEFT"?-lat:lat;
  const r=await p.evaluate((laty,z,V)=>{ GK_ANIM.reviewOverride=null; S.dbg.anim=false; ptReset(); S.pt.paused=true;
    ptGkFire({name:"MATRIX2", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:laty, z, v:V}}); gkAnimResetView(); S.gkAnim.flags=[];
    let cls=null, contact=null, atMax=null, maxU=-1, tCap=null;
    for(let k=0;k<150;k++){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); const g=S.pt.gk, c=S.gkAnim.cur; if(c&&c.cls&&!cls) cls=c.cls;
      if(c&&c.u!=null&&c.u>maxU){ maxU=c.u; tCap=S.pt.now; }
      if(g.contact&&!contact){ contact={t:g.contact.tickT, vol:g.contact.volume, out:g.contact.outcome}; tCap=g.contact.tickT; }
      if(g.contact&&S.pt.now-g.contact.tickT>0.3) break; }
    const lc=S.gkAnim.lastContact; return {cls, contact, tCap, art:S.gkAnim.cur&&S.gkAnim.cur.artLabel, lc:lc&&{errPx:lc.errPx,errM:lc.errM,src:lc.source,flagged:lc.flagged,artMissing:lc.artMissing,place:lc.place}, flags:S.gkAnim.flags.map(f=>f.why)}; },laty,z,V);
  // re-run to the capture tick and let the live loop draw the paused state, then crop
  const cap=await p.evaluate((laty,z,V,tCap)=>{ GK_ANIM.reviewOverride=null; S.dbg.anim=false; ptReset(); S.pt.paused=true; ptGkFire({name:"MATRIX2", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:laty, z, v:V}}); gkAnimResetView(); while(S.pt.now<(tCap||1.0)-1e-6) ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); const c=S.gkAnim.cur; return {artCap:c&&c.artLabel, stateCap:c&&c.state, uCap:c&&c.u, tNow:+S.pt.now.toFixed(3)}; },laty,z,V,r.tCap);
  await new Promise(res=>setTimeout(res,260));
  const sp=await p.evaluate(()=>{ const g=S.pt.gk; const q=sproj3(g.x,0,g.y); return [Math.round(q.x),Math.round(q.y)]; });
  const f=path.join(OUT,`cell_${side}_${ln}_${zn}.png`); await p.screenshot({path:f,clip:{x:Math.max(0,sp[0]-130),y:Math.max(0,sp[1]-190),width:260,height:250}});
  matrix.push({side,latName:ln,lat,zName:zn,z,speed:V,family:r.cls&&r.cls.family,goalSide:r.cls&&r.cls.goalSide,expr:r.cls&&r.cls.expr,cls:r.cls,contact:r.contact,art:cap.artCap||r.art,artEnd:r.art,stateCap:cap.stateCap,uCap:cap.uCap,tCap:cap.tNow,lc:r.lc,flags:r.flags,crop:path.basename(f)});
  console.log(side,ln,zn,"→",r.cls?(r.cls.family+" "+r.cls.goalSide+(r.cls.expr?" ["+r.cls.expr.heightClass+" int "+r.cls.expr.intensity+"]":"")+" norm "+r.cls.norm+" "+(r.cls.feetPlanted?"planted":"dive")):"no commit","| contact",r.contact?r.contact.vol+" "+r.contact.out:"none","| art@cap",(cap.artCap||r.art||"").slice(0,70),"u",cap.uCap,"t",cap.tNow);
}
fs.writeFileSync(path.join(OUT,"matrix2.json"),JSON.stringify({speed:V,matrix,errors:errs},null,1)); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
