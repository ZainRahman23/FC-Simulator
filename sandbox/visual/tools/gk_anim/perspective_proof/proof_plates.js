// TWO-POSE PERSPECTIVE PROOF — plates. The SET keeper exactly as the gameplay camera renders him (live camera and the 1:1 authoring
// camera, same sprite, same angle), plus two clean plates with the football at a CONTROLLED moderate target (real simulation commit at
// contact height z and reach norm ~0.72), one to each side of the goal. No arrows, no annotations.  node proof_plates.js <outdir> <z> <norm>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"proof_plates"; const Z=+(process.argv[3]||1.45); const NORM=+(process.argv[4]||0.72); fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-proof",args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const setup=async(rail,zoom)=>p.evaluate((rail,zoom)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; S.dbg.cam=false; S.dbg.gk=false;
  GK_ANIM.reviewOverride=null; ptGkFire({name:"PLATE", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
  S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
  for(let i=0;i<40;i++) ptStep();
  RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom; },rail,zoom);
const geom=async()=>p.evaluate(()=>{ const g=S.pt.gk; const P=(x,z,y)=>{const q=sproj3(x,z,y);return [+q.x.toFixed(2),+q.y.toFixed(2)];};
  const sp=sproj3(g.x,0,g.y); const s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
  return {keeper:[+g.x.toFixed(3),+g.y.toFixed(3)], facingDeg:+(g.facing*180/Math.PI).toFixed(1), height:g.height, root:P(g.x,0,g.y), spriteScale:+s.toFixed(4), ey:P(g.x,0,g.y+1), eyN:P(g.x,0,g.y-1), ex:P(g.x-1,0,g.y), ez:P(g.x,1,g.y), rail:RIG.x, zoom:RIG.zoom, dir:headingToDir(g.facing*180/Math.PI)}; });
// envelope solve: lateral for the requested norm at height Z (same formula as the review page)
const env=await (async()=>{ await setup(88,1.25); return p.evaluate((Z,NORM)=>{ const t=S.pt, gk=t.gk; const env=gkEnvelope(t,gk,gkHeightM(t,gk)); const dz=Z-env.comfortZ, vMax=dz>=0?env.maxVertUp:env.maxVertDown, pp=GK_REACH.envExp; const vt=Math.abs(dz/vMax); const inner=Math.pow(NORM,pp)-Math.pow(vt,pp); const L=inner<=0?0:env.maxLat*Math.pow(inner,1/pp); return {lat:+L.toFixed(3), maxLat:+env.maxLat.toFixed(3), comfortZ:+env.comfortZ.toFixed(3), maxVertUp:+env.maxVertUp.toFixed(3), p:pp}; },Z,NORM); })();
console.log("envelope:",JSON.stringify(env),"→ z",Z,"norm",NORM,"lateral",env.lat);
// 1. LIVE camera SET reference (rail 88, zoom 1.25) — the keeper exactly as the playtest renders him
await setup(88,1.25); await new Promise(r=>setTimeout(r,400)); let G=await geom(); fs.writeFileSync(path.join(OUT,"geom_live.json"),JSON.stringify(G,null,1));
await p.screenshot({path:path.join(OUT,"live_full.png"),clip:{x:0,y:0,width:1100,height:900}});
const lr=[Math.round(G.root[0]),Math.round(G.root[1])]; await p.screenshot({path:path.join(OUT,"live_set_crop.png"),clip:{x:lr[0]-85,y:lr[1]-115,width:170,height:150}});
fs.writeFileSync(path.join(OUT,"live_crop_origin.json"),JSON.stringify({x0:lr[0]-85,y0:lr[1]-115,root:[85,115]}));
// 2. 1:1 authoring camera (sprite scale 1.0): same sprite, same camera angle, native pixel size
const z1=await p.evaluate(()=>{ const g=S.pt.gk; const sp=sproj3(g.x,0,g.y); return RIG.zoom/(S.playerVScale*depthScale(sp.d)*RIG.zoom*RES); });
await setup(102.2,z1); await new Promise(r=>setTimeout(r,400)); G=await geom(); fs.writeFileSync(path.join(OUT,"geom_auth.json"),JSON.stringify(G,null,1));
const cx=Math.round(G.root[0]), cy=Math.round(G.root[1]); const PW=448, PH=352; const px0=cx-190, py0=cy-236;
await p.screenshot({path:path.join(OUT,"auth_set_plate.png"),clip:{x:px0,y:py0,width:PW,height:PH}});
fs.writeFileSync(path.join(OUT,"plate_origin.json"),JSON.stringify({px0,py0,PW,PH,rootInPlate:[190,236],spriteScale:G.spriteScale,rail:G.rail,zoom:G.zoom,crop:{x0:102,y0:46,w:176,h:240,rootInCrop:[88,190]}}));
console.log("auth camera zoom",z1.toFixed(3),"scale",G.spriteScale,"root",G.root,"facing",G.facingDeg,G.dir);
// 3. per-side plates: real commit from a goal-line synthetic arrival (24 m/s) at (lateral, Z); the ball is placed at the committed target
const plates=[];
for(const [side,sg] of [["GOAL_LEFT",-1],["GOAL_RIGHT",1]]){
  const laty=sg*env.lat;
  const r=await p.evaluate((laty,z,rail,zoom)=>{ ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null;
    ptGkFire({name:"PROOF "+laty+"/"+z, origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:laty, z, v:24}}); gkAnimResetView();
    let cm=null; for(let k=0;k<120;k++){ ptStep(); if(S.pt.gk.committed){ cm=S.pt.gk.committed; break; } }
    if(!cm) return null; const g=S.pt.gk;
    S.pt.b.x=cm.target[0]; S.pt.b.y=cm.target[1]; S.pt.b.z=cm.target[2]; S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0;
    RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom;
    GK_ANIM.reviewOverride={kind:"state", state:"set", dir:headingToDir(g.facing*180/Math.PI), showLabel:false};
    const P=(x,zz,y)=>{const q=sproj3(x,zz,y);return [+q.x.toFixed(2),+q.y.toFixed(2)];}; const cls=gkAnimClassify(g,cm,g.facing);
    return {feet:cm.feet.map(v=>+v.toFixed(3)), target:cm.target.map(v=>+v.toFixed(3)), action:cm.action, tier:cm.tier, envNorm:cm.envNorm, maxLat:cm.diveSpanMax, execTime:+cm.execTime.toFixed(3), facingDeg:+(g.facing*180/Math.PI).toFixed(1), root:P(g.x,0,g.y), targetScreen:P(cm.target[0],cm.target[2],cm.target[1]), targetGround:P(cm.target[0],0,cm.target[1]), family:cls.family, goalSide:cls.goalSide, heightClass:cls.expr&&cls.expr.heightClass, norm:cls.norm, lat:cls.lat, z:cls.z, depth:cls.depth}; },laty,Z,102.2,z1);
  await new Promise(r=>setTimeout(r,350));
  const f=path.join(OUT,`plate_${side}.png`); await p.screenshot({path:f,clip:{x:px0,y:py0,width:PW,height:PH}});
  plates.push({side,laty,z:Z,file:path.basename(f),commit:r}); console.log(side, r?("target "+JSON.stringify(r.target)+" screen "+JSON.stringify(r.targetScreen)+" root "+JSON.stringify(r.root)+" "+r.action+"/"+r.tier+" norm "+r.envNorm+" → "+r.family+" "+r.goalSide+" "+r.heightClass):"NO COMMIT");
}
fs.writeFileSync(path.join(OUT,"plates.json"),JSON.stringify({z:Z,norm:NORM,env,plates,origin:{px0,py0,PW,PH,rootInPlate:[190,236]}},null,1)); await b.close();})();
