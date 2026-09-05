// W | SW | NW IDENTICAL-SCENARIO CAPTURE, live zoom (1.25) with the camera rail centred on the keeper (the paused page loop does not track):
// settle 2 s (not captured) → readiness 3 s → ball slides A m across the bearing over 1.5 s and back over 1.5 s (genuine footwork both ways)
// → readiness 3 s. Page loop paused; the harness steps 60 Hz and runs the keeper draw through the normal renderer; screenshots after the
// page's own redraw. Per-frame trace incl. the blit rectangle (patched gkAnimBlit). node wsn_capture2.js <url> <outdir> <R m> <A m>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const URL=process.argv[2]; const OUT=process.argv[3]; const R=+process.argv[4]||22; const AMP=+process.argv[5]||6; fs.mkdirSync(OUT,{recursive:true});
const BEAR={west:180,"south-west":135,"north-west":225};
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-wsn2-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ const orig=gkAnimBlit; gkAnimBlit=function(img,mirror,ax,ay,s,sx,sy,g){ const r=orig(img,mirror,ax,ay,s,sx,sy,g); window.__blit={dx:r.dx,dy:r.dy,dw:r.dw,dh:r.dh,ax:+ax.toFixed(2),ay:+ay.toFixed(2),sx:+sx.toFixed(2),sy:+sy.toFixed(2),s:+s.toFixed(4),mirror:!!mirror}; return r; }; });
const rec={};
for(const [d,deg] of Object.entries(BEAR)){
  const cam=await p.evaluate((deg,R)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
    const a=deg*Math.PI/180; ptGkFire({name:"WSN", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
    S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView(); window.__cap={a, f:0};
    for(let f=0;f<120;f++){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); window.__cap.f++; }
    RIG.mode="manual"; RIG.zoom=1.25; RIG.zoomTarget=1.25; RIG.manualX=S.pt.gk.x; RIG.targetX=S.pt.gk.x; RIG.x=S.pt.gk.x; const q=sproj3(S.pt.gk.x,0,S.pt.gk.y); return {rig:RIG.x, zoom:RIG.zoom, sp:[+q.x.toFixed(1),+q.y.toFixed(1)]}; },deg,R);
  await new Promise(r=>setTimeout(r,150)); cam.sp=await p.evaluate(()=>{ const q=sproj3(S.pt.gk.x,0,S.pt.gk.y); return [+q.x.toFixed(1),+q.y.toFixed(1)]; });   // the page's own redraw applies the manual rail before the crop origin is read
  console.log(d,"camera",JSON.stringify(cam)); rec[d]=[];
  for(let k=120;k<660;k++){
    const info=await p.evaluate((AMP)=>{ const c=window.__cap; const step=AMP/90; if(c.f>=300&&c.f<390){ S.pt.b.x+=step*(-Math.sin(c.a)); S.pt.b.y+=step*Math.cos(c.a); } else if(c.f>=390&&c.f<480){ S.pt.b.x-=step*(-Math.sin(c.a)); S.pt.b.y-=step*Math.cos(c.a); } ptStep(); c.f++;
      gkAnimDraw(S.pt,S.pt.gk,1/60); const g=S.pt.gk, cur=S.gkAnim.cur, A=S.gkAnim, bl=window.__blit||{}; const q=sproj3(g.x,0,g.y);
      const bob = cur.state==="IDLE" ? Math.round(GK_ANIM.idleBobPx*(0.5-0.5*Math.cos(2*Math.PI*S.pt.now/GK_ANIM.idleBobPeriod))) : 0;
      return {f:c.f, t:+S.pt.now.toFixed(3), sp:[+q.x.toFixed(2),+q.y.toFixed(2)], state:cur.state, phase:cur.phase, family:cur.family, side:cur.side, dir:cur.dir, clip:cur.clip?{name:cur.clip.name, vdir:cur.clip.v.dir, mirrored:cur.clip.mirrored, pos:cur.clip.pos, srcFrame:cur.clip.v.frames[cur.clip.pos].idx, n:cur.clip.v.frames.length, strideM:cur.clip.v.strideM, sideApprox:cur.clip.sideApprox}:null, art:cur.artLabel, simState:g.state, v:+Math.hypot(g.vx,g.vy).toFixed(4), root:[+g.x.toFixed(4),+g.y.toFixed(4)], odo:+A.odo.toFixed(4), cyc:cur.clip?+((A.odo/cur.clip.v.strideM)*cur.clip.v.frames.length).toFixed(3):null, bob, blit:bl, facing:+(g.facing*180/Math.PI).toFixed(1), ballD:+Math.hypot(S.pt.b.x-g.x,S.pt.b.y-g.y).toFixed(2), temp:cur.temp||null}; }, AMP);
    if(info.f%2===0){ await new Promise(r=>setTimeout(r,35)); const clip={x:Math.round(cam.sp[0])-60,y:Math.round(cam.sp[1])-62,width:120,height:76}; const f=path.join(OUT,`${d}_${String(info.f).padStart(3,"0")}.png`); await p.screenshot({path:f,clip}); info.file=path.basename(f); }
    rec[d].push(info);
  }
  const st={}; rec[d].forEach(r=>{st[r.state]=(st[r.state]||0)+1;}); console.log(d,"frames",rec[d].length,"states",JSON.stringify(st));
}
fs.writeFileSync(path.join(OUT,"trace.json"),JSON.stringify(rec)); await b.close();})();
