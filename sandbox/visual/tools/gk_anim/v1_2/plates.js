// CAMERA-SPACE SAVE REFERENCES (Animation V1.2, Phases 1–2, 12–13).
//  1. proof screenshot at the LIVE playtest camera: keeper at SET, goal, goal line, SAVE_GOAL_LEFT / RIGHT arrows, depth arrow, vertical axis
//  2. the same at the 1:1 authoring camera (sprite scale 1.0) → GK_SAVE_REFERENCE_LEFT/RIGHT.png (annotated) + clean plate
//  3. per-pose generation plates: the ball placed at the SIMULATION's committed target for each demand (real commits from
//     goal-line synthetic arrivals at 24 m/s), keeper at SET on the commit tick, arrow from the feet to the target
//   node plates.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"plates"; fs.mkdirSync(OUT,{recursive:true});
const POSES=[["LOW_COLLAPSE","GOAL_LEFT",-1.2,0.30],["LOW_COLLAPSE","GOAL_RIGHT",1.2,0.30],["AIRBORNE_MID","GOAL_LEFT",-1.5,1.0],["AIRBORNE_MID","GOAL_RIGHT",1.5,1.0],["AIRBORNE_HIGH","GOAL_LEFT",-1.5,1.7],["AIRBORNE_HIGH","GOAL_RIGHT",1.5,1.7],["AIRBORNE_TOP","GOAL_LEFT",-1.8,2.2],["AIRBORNE_TOP","GOAL_RIGHT",1.8,2.2]];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-plates",args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
// helper: set the keeper at SET for a central shooter (scenario 0 origin), paused, step a few ticks so positioning settles
const setup=async(rail,zoom)=>p.evaluate((rail,zoom)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; S.dbg.cam=false; S.dbg.gk=false;
  GK_ANIM.reviewOverride=null; ptGkFire({name:"PLATE", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); // ball parked (v≈0 → never arrives); keeper positions for a central ball
  S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
  for(let i=0;i<40;i++) ptStep();
  RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom; },rail,zoom);
const geom=async()=>p.evaluate(()=>{ const g=S.pt.gk; const P=(x,z,y)=>{const q=sproj3(x,z,y);return [+q.x.toFixed(2),+q.y.toFixed(2)];};
  const sp=sproj3(g.x,0,g.y); const s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
  return {keeper:[g.x,g.y], facingDeg:g.facing*180/Math.PI, height:g.height, handZ:g.handZ, root:P(g.x,0,g.y), spriteScale:s, ey:P(g.x,0,g.y+1), eyN:P(g.x,0,g.y-1), ex:P(g.x-1,0,g.y), ez:P(g.x,1,g.y),
    goalC:P(105,0,34), postN:P(105,0,30.34), postS:P(105,0,37.66), barN:P(105,2.44,30.34), barS:P(105,2.44,37.66), lineN:P(105,0,25), lineS:P(105,0,43), canvas:[cv.width,cv.height], rail:RIG.x, zoom:RIG.zoom}; });
// 1. LIVE camera proof
await setup(88,1.25); await new Promise(r=>setTimeout(r,400));
let G=await geom(); fs.writeFileSync(path.join(OUT,"geom_live.json"),JSON.stringify(G,null,1));
await p.screenshot({path:path.join(OUT,"live_camera_raw.png"),clip:{x:0,y:0,width:1100,height:900}});
// 2. 1:1 authoring camera: zoom so that the sprite scale is exactly 1.0, rail so the keeper sits left of centre with the goal in frame
const z1=await p.evaluate(()=>{ const g=S.pt.gk; const sp=sproj3(g.x,0,g.y); return RIG.zoom/(S.playerVScale*depthScale(sp.d)*RIG.zoom*RES); });
await setup(102.2, z1); await new Promise(r=>setTimeout(r,400));
G=await geom(); fs.writeFileSync(path.join(OUT,"geom_auth.json"),JSON.stringify(G,null,1));
const cx=Math.round(G.root[0]), cy=Math.round(G.root[1]); const PW=448, PH=352; const px0=cx-190, py0=cy-236;   // keeper root at (190, 236) in the plate
fs.writeFileSync(path.join(OUT,"plate_origin.json"),JSON.stringify({px0,py0,PW,PH,rootInPlate:[190,236],spriteScale:G.spriteScale,rail:G.rail,zoom:G.zoom}));
await p.screenshot({path:path.join(OUT,"auth_plate_clean.png"),clip:{x:px0,y:py0,width:PW,height:PH}});
console.log("auth camera zoom",z1.toFixed(3),"scale",G.spriteScale.toFixed(4),"root",G.root,"goalC",G.goalC,"postN",G.postN,"postS",G.postS);
// 3. per-pose plates: real commits from goal-line synthetic arrivals (24 m/s); ball placed at the committed target on the commit tick
const plates=[];
for(const [fam,side,laty,z] of POSES){
  const r=await p.evaluate((laty,z,rail,zoom)=>{ ptReset(); S.pt.paused=true; S.dbg.anim=false;
    ptGkFire({name:"PLATE "+laty+"/"+z, origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:laty, z, v:24}}); gkAnimResetView();
    let cm=null; for(let k=0;k<120;k++){ ptStep(); if(S.pt.gk.committed){ cm=S.pt.gk.committed; break; } }
    if(!cm) return null;
    const g=S.pt.gk; const c=S.gkAnim.cur; // keeper is at the commit tick (u≈0 → SET pose drawn); place the BALL at the committed target for the plate
    S.pt.b.x=cm.target[0]; S.pt.b.y=cm.target[1]; S.pt.b.z=cm.target[2]; S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0;
    RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom;
    GK_ANIM.reviewOverride={kind:"state", state:"set", dir:headingToDir(g.facing*180/Math.PI), showLabel:false};   // plate shows the keeper in SET (the pose is what PixelLab must author)
    const P=(x,zz,y)=>{const q=sproj3(x,zz,y);return [+q.x.toFixed(2),+q.y.toFixed(2)];};
    const cls=gkAnimClassify(g,cm,g.facing);
    return {feet:cm.feet, target:cm.target, handOrigin:cm.handOrigin, action:cm.action, tier:cm.tier, envNorm:cm.envNorm, maxLat:cm.diveSpanMax, execTime:cm.execTime, t0:cm.t0, now:S.pt.now, facingDeg:g.facing*180/Math.PI, root:P(g.x,0,g.y), feetScreen:P(cm.feet[0],0,cm.feet[1]), targetScreen:P(cm.target[0],cm.target[2],cm.target[1]), targetGround:P(cm.target[0],0,cm.target[1]), cls}; },laty,z,102.2,z1);
  await new Promise(r=>setTimeout(r,350));
  const name=`${fam}_${side}`; const f=path.join(OUT,`plate_${name}.png`); await p.screenshot({path:f,clip:{x:px0,y:py0,width:PW,height:PH}});
  plates.push({name,fam,side,laty,z,file:path.basename(f),commit:r}); console.log(name, r?("target "+JSON.stringify(r.target.map(v=>+v.toFixed(2)))+" "+r.action+"/"+r.tier+" norm "+r.envNorm+" → "+r.cls.family+" "+r.cls.goalSide):"NO COMMIT");
}
fs.writeFileSync(path.join(OUT,"plates.json"),JSON.stringify({plates,origin:{px0,py0,PW,PH,rootInPlate:[190,236]}},null,1)); await b.close();})();
