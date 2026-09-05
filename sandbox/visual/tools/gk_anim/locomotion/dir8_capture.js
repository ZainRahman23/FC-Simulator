// 8-DIRECTION VISUAL CAPTURE for the acceptance sheet/GIFs: same emulated live loop as dir8_trace.js (60 Hz), screenshots of the keeper at
// the 1:1 camera every 0.1 s from 2.0 s to 9.0 s (hold → nudge at 6 s → shuffle → return). node dir8_capture.js <url> <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const URL=process.argv[2]; const OUT=process.argv[3]; fs.mkdirSync(OUT,{recursive:true});
const BEAR={north:270,"north-east":315,east:0,"south-east":45,south:90,"south-west":135,west:180,"north-west":225};
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-cap8-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const rec={};
for(const [d,deg] of Object.entries(BEAR)){
  await p.evaluate((deg)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
    const a=deg*Math.PI/180, R=30; ptGkFire({name:"CAP8", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
    S.pt.paused=false; gkAnimResetView(); window.__cap={a, f:0}; RIG.mode="manual"; RIG.manualX=102.2; RIG.targetX=102.2; RIG.x=102.2; RIG.zoom=2.990127635821332; RIG.zoomTarget=RIG.zoom; },deg);
  rec[d]=[];
  for(let k=0;k<420;k++){   // 7 s at 60 Hz frames; capture every 6th frame (0.1 s)
    const info=await p.evaluate(()=>{ const c=window.__cap; for(let i=0;i<1;i++){ if(c.f===360){ S.pt.b.x+=6*(-Math.sin(c.a)); S.pt.b.y+=6*Math.cos(c.a); } ptStep(); c.f++; }
      // the real loop draws the whole frame; we call the keeper draw through the normal render so the screenshot is the live output
      const g=S.pt.gk; const q=sproj3(g.x,0,g.y); const cur=S.gkAnim.cur; return {f:c.f, t:+S.pt.now.toFixed(2), sp:[Math.round(q.x),Math.round(q.y)], state:cur&&cur.state, clip:cur&&cur.clip?cur.clip.name+"/"+cur.clip.v.dir+(cur.clip.mirrored?"m":"")+"#"+cur.clip.pos:null, simState:g.state, v:+Math.hypot(g.vx,g.vy).toFixed(3)}; });
    if(info.f>=120 && info.f%6===0){ await new Promise(r=>setTimeout(r,40)); const clip={x:info.sp[0]-90,y:info.sp[1]-130,width:180,height:170}; const f=path.join(OUT,`${d}_${String(info.f).padStart(3,"0")}.png`); await p.screenshot({path:f,clip}); rec[d].push({file:path.basename(f),...info}); }
  }
  console.log(d,"captured",rec[d].length,"states",[...new Set(rec[d].map(r=>r.state))].join(","));
}
fs.writeFileSync(path.join(OUT,"cap.json"),JSON.stringify(rec)); await b.close();})();
