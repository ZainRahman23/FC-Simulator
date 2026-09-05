// LIVE DRIBBLING CAPTURE — the real playtest (Single Player Test) page, real keys, real carry, real positioning controller, real keeper
// state machine. Nothing forced or synthetic: the harness only (1) pauses the page's own frame loop and steps ptStep() at the fixed
// 60 Hz itself, (2) sets S.pt.keys exactly as the keyboard handler would, (3) records what the renderer drew. Camera: "live" = exactly
// ptEnter's camera (rail 88, zoom 1.25); "big" = zoom 2.99 with the rail centred on the keeper (presentation scale only; the
// simulation and the animation decisions do not read the camera).  node dribble_live.js <url> <outdir> <live|big>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const URL=process.argv[2]; const OUT=process.argv[3]; const CAM=process.argv[4]||"big"; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-drib-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate((CAM)=>{ const orig=gkAnimBlit; gkAnimBlit=function(img,mirror,ax,ay,s,sx,sy,g){ const r=orig(img,mirror,ax,ay,s,sx,sy,g); window.__blit={dx:r.dx,dy:r.dy,dw:r.dw,dh:r.dh,ax:+ax.toFixed(2),ay:+ay.toFixed(2),s:+s.toFixed(4),mirror:!!mirror,w:img.width,h:img.height}; return r; };
  if(!(S.pt&&S.pt.on)) ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.keys={};
  if(CAM==="big"){ RIG.zoom=2.990127635821332; RIG.zoomTarget=RIG.zoom; }
  window.__drib={tick:0, seg:0, segTick:0, log:[]}; },CAM);
// SEGMENTS: the ball carrier (arrow keys) — settle, hold at W, tap-dribble south to the SW bearing, hold, tap-dribble north through W (hold) to NW, hold.
// tap-dribble = key held 15 ticks, released 15 ticks (the game has no walk; this is a slow, controlled dribble ≈ 2 m/s average).
const segs=[
  {name:"settle", ticks:180, keys:{}},
  {name:"hold W", ticks:300, keys:{}},
  {name:"dribble S", until:(st)=>st.by>=56.5, max:1500, tap:"down"},
  {name:"hold SW", ticks:360, keys:{}},
  {name:"dribble N (to W)", until:(st)=>st.by<=34.5, max:1500, tap:"up"},
  {name:"hold W2", ticks:360, keys:{}},
  {name:"dribble N (to NW)", until:(st)=>st.by<=11.5, max:1500, tap:"up"},
  {name:"hold NW", ticks:360, keys:{}},
];
const rec=[]; let tick=0;
for(const sg of segs){
  let n=0; const limit=sg.ticks!=null?sg.ticks:sg.max;
  while(n<limit){
    const keys = sg.tap ? ((n%30)<15 ? {[sg.tap]:true} : {}) : (sg.keys||{});
    const st=await p.evaluate((keys,CAM,segName,segTick)=>{ S.pt.keys=keys; ptStep(); if(CAM==="big"){ RIG.manualX=S.pt.gk.x; RIG.targetX=S.pt.gk.x; RIG.x=S.pt.gk.x; }
      gkAnimDraw(S.pt,S.pt.gk,1/60); const t=S.pt, g=t.gk, cur=S.gkAnim.cur, A=S.gkAnim, bl=window.__blit||{}; const q=sproj3(g.x,0,g.y);
      const c=cur.clip; return {t:+t.now.toFixed(3), seg:segName, segTick, keys:Object.keys(keys).join("+")||"-", px:+t.p.x.toFixed(3), py:+t.p.y.toFixed(3), pv:+Math.hypot(t.p.vx,t.p.vy).toFixed(2), bx:+t.b.x.toFixed(3), by:+t.b.y.toFixed(3), ctrl:!!t.b.ctrl, ballD:+Math.hypot(t.b.x-g.x,t.b.y-g.y).toFixed(2),
        gx:+g.x.toFixed(4), gy:+g.y.toFixed(4), v:+Math.hypot(g.vx,g.vy).toFixed(4), sim:g.state, facing:+(g.facing*180/Math.PI).toFixed(1), dir:cur.dir, state:cur.state, phase:cur.phase, clip:c?{name:c.name, vdir:c.v.dir, mirrored:c.mirrored, pos:c.pos, src:c.v.frames[c.pos].idx, n:c.v.frames.length, stride:c.v.strideM, sideApprox:c.sideApprox}:null, art:cur.artLabel, odo:+A.odo.toFixed(4), cyc:c?+((A.odo/c.v.strideM)*c.v.frames.length).toFixed(3):null, bob: cur.state==="IDLE"?Math.round(GK_ANIM.idleBobPx*(0.5-0.5*Math.cos(2*Math.PI*t.now/GK_ANIM.idleBobPeriod))):0, blit:bl, sp:[+q.x.toFixed(2),+q.y.toFixed(2)], rig:+RIG.x.toFixed(2), zoom:+RIG.zoom.toFixed(3)}; }, keys, CAM, sg.name, n);
    if(tick%2===0){ await new Promise(r=>setTimeout(r,30)); const big=CAM==="big"; const clip= big? {x:Math.round(st.sp[0])-90,y:Math.round(st.sp[1])-150,width:180,height:170} : {x:Math.round(st.sp[0])-60,y:Math.round(st.sp[1])-62,width:120,height:76}; const f=`f${String(tick).padStart(5,"0")}.png`; await p.screenshot({path:path.join(OUT,f),clip}); st.file=f; }
    rec.push(st); n++; tick++;
    if(sg.until && sg.until(st)) break;
  }
  const last=rec[rec.length-1]; console.log(`${sg.name.padEnd(18)} ends t=${last.t}s ball (${last.bx}, ${last.by}) ballD ${last.ballD} keeper (${last.gx}, ${last.gy}) facing ${last.facing}° dir ${last.dir} anim ${last.state} sim ${last.sim} |v| ${last.v}`);
}
fs.writeFileSync(path.join(OUT,"trace.json"),JSON.stringify(rec)); console.log("frames",rec.length,"screens",rec.filter(r=>r.file).length); await b.close();})();
