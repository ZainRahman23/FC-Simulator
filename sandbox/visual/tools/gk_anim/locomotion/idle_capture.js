// LIVE-PATH readiness capture: the real state machine (no override). Ball parked 30 m away along the bearing → state IDLE (living bob),
// keeper faces W / SW / NW. Same tick count after reset for every direction → identical phase. node idle_capture.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"idle"; fs.mkdirSync(OUT,{recursive:true});
const BEAR={west:180,"south-west":135,"north-west":225};
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-idle-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const rec={};
for(const [d,deg] of Object.entries(BEAR)){
  const st=await p.evaluate((deg)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null;
    const a=deg*Math.PI/180, R=30, ax=101.7, ay=34; const origin=[ax+Math.cos(a)*R, ay+Math.sin(a)*R];
    ptGkFire({name:"IDLE "+deg, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
    for(let i=0;i<240;i++) ptStep();   // settle: keeper positions and stops → IDLE
    RIG.mode="manual"; RIG.manualX=102.2; RIG.targetX=102.2; RIG.x=102.2; RIG.zoom=2.990127635821332; RIG.zoomTarget=RIG.zoom;
    gkAnimDraw(S.pt,S.pt.gk,1/60); const c=S.gkAnim.cur; const g=S.pt.gk; const dist=Math.hypot(S.pt.b.x-g.x,S.pt.b.y-g.y);
    return {t:+S.pt.now.toFixed(3), state:c&&c.state, phase:c&&c.phase, dir:c&&c.dir, facingDeg:+(g.facing*180/Math.PI).toFixed(1), ballDist:+dist.toFixed(1), art:c&&c.artLabel, root:[+g.x.toFixed(2),+g.y.toFixed(2)], speed:+(Math.hypot(g.vx||0,g.vy||0)).toFixed(3)}; },deg);
  await new Promise(r=>setTimeout(r,300));
  const frames=[];
  for(let k=0;k<36;k++){   // 36 × 0.1 s = one 3.6 s readiness cycle
    const info=await p.evaluate(()=>{ for(let i=0;i<6;i++) ptStep(); const g=S.pt.gk; const q=sproj3(g.x,0,g.y); const c=S.gkAnim.cur; return {sp:[Math.round(q.x),Math.round(q.y)], t:+S.pt.now.toFixed(2), state:c&&c.state, dy:Math.round(GK_ANIM.idleBobPx*(0.5-0.5*Math.cos(2*Math.PI*S.pt.now/GK_ANIM.idleBobPeriod))), art:c&&c.artLabel}; });
    await new Promise(r=>setTimeout(r,70));
    const clip={x:info.sp[0]-110,y:info.sp[1]-150,width:220,height:200}; const f=path.join(OUT,`${d}_${String(k).padStart(2,"0")}.png`); await p.screenshot({path:f,clip}); frames.push({file:path.basename(f),root:[110,150],...info});
  }
  rec[d]={setup:st,frames}; console.log(d,JSON.stringify(st),"| frames",frames.length,"states",[...new Set(frames.map(f=>f.state))].join(","),"dy",frames.map(f=>f.dy).join(""));
}
fs.writeFileSync(path.join(OUT,"idle.json"),JSON.stringify({rec,errors:errs},null,1)); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
