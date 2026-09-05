// 8-DIRECTION LIVE-STATE TRACE. Emulates the real frame loop (tick(): accumulator of frame dt × slow-mo → fixed 60 Hz ptStep, then the
// keeper draw → gkAnimDraw) at a chosen display cadence, for each facing: settle (tracking → idle), hold, nudge the ball 6 m across
// the bearing (real shuffle), settle again. Records the simulation and animation state per frame.
//   node dir8_trace.js <page url> <outdir> <cadence: 60|120|slow>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const URL=process.argv[2]; const OUT=process.argv[3]; const CAD=process.argv[4]||"60"; fs.mkdirSync(OUT,{recursive:true});
const BEAR={north:270,"north-east":315,east:0,"south-east":45,south:90,"south-west":135,west:180,"north-west":225};
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-dir8-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const all={};
for(const [d,deg] of Object.entries(BEAR)){
  const rows=await p.evaluate((deg,CAD)=>{
    if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
    const a=deg*Math.PI/180, R=30, ax=101.7, ay=34; const origin=[ax+Math.cos(a)*R, ay+Math.sin(a)*R];
    ptGkFire({name:"DIR8", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
    S.pt.paused=false; gkAnimResetView();
    const dtF = CAD==="120" ? 1/120 : 1/60; const mul = CAD==="slow" ? 0.5 : 1; const frames = CAD==="120" ? 1440 : (CAD==="slow" ? 1440 : 720);   // 12 s of sim time
    let pacc=0, prev=null; const out=[];
    for(let f=0; f<frames; f++){
      if(f===Math.round(6/(dtF*mul))){ const px=-Math.sin(a), py=Math.cos(a); S.pt.b.x+=6*px; S.pt.b.y+=6*py; }   // nudge 6 m across the bearing → real re-positioning
      pacc+=dtF*mul; let ticks=0; while(pacc>=PT_DT){ ptStep(); pacc-=PT_DT; ticks++; }
      gkAnimDraw(S.pt,S.pt.gk,dtF);
      const g=S.pt.gk, c=S.gkAnim.cur, A=S.gkAnim; const disp=prev?Math.hypot(g.x-prev[0],g.y-prev[1]):0; prev=[g.x,g.y];
      const dy = c&&c.state==="IDLE" ? Math.round(GK_ANIM.idleBobPx*(0.5-0.5*Math.cos(2*Math.PI*S.pt.now/GK_ANIM.idleBobPeriod))) : 0;
      out.push([f,+S.pt.now.toFixed(4),ticks,g.state,+g.posError.toFixed(4),+Math.hypot(g.vx,g.vy).toFixed(4),+g.x.toFixed(4),+g.y.toFixed(4),+disp.toFixed(5),+(g.facing*180/Math.PI).toFixed(1),c?c.state:null,c&&c.clip?c.clip.name+"/"+c.clip.v.dir+(c.clip.mirrored?"m":"")+"#"+c.clip.pos:null,dy,+A.odo.toFixed(4),c?c.artLabel:null]);
    }
    return out; },deg,CAD);
  all[d]={cols:["frame","t","ticks","simState","posErr","simV","x","y","disp","facingDeg","animState","clip","dy","odo","art"],rows};
  const st=rows.map(r=>r[10]); const runs=[]; let cur=null; for(const r of rows){ if(!cur||cur.s!==r[10]){ cur={s:r[10],from:r[1],n:0}; runs.push(cur);} cur.n++; }
  console.log(d.padEnd(11),"facing",rows[300][9],"| state runs:",runs.map(x=>x.s+"@"+x.from.toFixed(2)+"×"+x.n).join(" "));
}
fs.writeFileSync(path.join(OUT,`trace_${CAD}.json`),JSON.stringify(all)); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
