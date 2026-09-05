// FORCED PRESENTATION A/B (review-only override, no production path): keeper parked at R 22 on each bearing, then the review override
// draws (row 1) FORCED IDLE = base rotation + living bob on a sim-time clock, (row 2) FORCED SHUFFLE with a synthetic phase at WEST's
// in-play readiness cadence (0.7 frames/s), (row 3) FORCED SHUFFLE at 10 frames/s. Live camera. node forced_ab.js <url> <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const URL=process.argv[2]; const OUT=process.argv[3]; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-fab-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const rec={};
for(const [d,deg] of Object.entries({west:180,"south-west":135,"north-west":225})){
  const sp=await p.evaluate((deg)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
    const a=deg*Math.PI/180, R=22; ptGkFire({name:"FAB", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
    S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView();
    for(let f=0;f<150;f++) ptStep(); RIG.mode="manual"; RIG.zoom=1.25; RIG.zoomTarget=1.25; RIG.manualX=S.pt.gk.x; RIG.targetX=S.pt.gk.x; RIG.x=S.pt.gk.x; const g=S.pt.gk, q=sproj3(g.x,0,g.y); return {x:q.x,y:q.y,dir:headingToDir(g.facing*180/Math.PI)}; },deg);
  await new Promise(r=>setTimeout(r,150)); const q2=await p.evaluate(()=>{ const q=sproj3(S.pt.gk.x,0,S.pt.gk.y); return [q.x,q.y]; }); sp.x=q2[0]; sp.y=q2[1];
  rec[d]={sp, modes:{}};
  for(const mode of ["idle","shuffle_slow","shuffle_10fps"]){
    rec[d].modes[mode]=[];
    for(let k=0;k<120;k++){ const tsec=k/20;
      const info=await p.evaluate((mode,tsec,dir)=>{ let o;
        if(mode==="idle") o={kind:"state", state:"base", dir, living:true, clock:tsec, showLabel:false};
        else { const r=gkAnimResolve(S.gkAnim.clips.shuffle, dir, "RIGHT"); const n=r.v.frames.length; const fps=mode==="shuffle_slow"?0.7:10; const pos=Math.floor(tsec*fps)%n; o={kind:"clip", clip:"shuffle", dir, side:"RIGHT", pos, showLabel:false}; }
        GK_ANIM.reviewOverride=o; return {pos:o.pos!=null?o.pos:null, bob: mode==="idle"?Math.round(GK_ANIM.idleBobPx*(0.5-0.5*Math.cos(2*Math.PI*tsec/GK_ANIM.idleBobPeriod))):null}; }, mode, tsec, sp.dir);
      await new Promise(r=>setTimeout(r,45));
      const f=path.join(OUT,`${d}_${mode}_${String(k).padStart(3,"0")}.png`); await p.screenshot({path:f, clip:{x:Math.round(sp.x)-60, y:Math.round(sp.y)-62, width:120, height:76}}); rec[d].modes[mode].push({k, t:tsec, file:path.basename(f), ...info});
    }
  }
  await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
  console.log(d,"done at",sp);
}
fs.writeFileSync(path.join(OUT,"rec.json"),JSON.stringify(rec)); await b.close();})();
