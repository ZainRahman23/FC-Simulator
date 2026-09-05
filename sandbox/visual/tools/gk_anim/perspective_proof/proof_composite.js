// TWO-POSE PERSPECTIVE PROOF — composites on the real renderer. Loads the proof manifest on the playtest page, fires the same controlled
// arrival used for the plates, holds the commit tick, places the ball at the committed target and draws the RAW authored pose at the root
// (no IK). Clean captures (no overlays) and diagnostic captures (root, save vector, target, gloves) at the live camera and the 1:1 camera.
//   node proof_composite.js <outdir> <manifest url relative to sandbox/visual/> <lat> <z>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"proof_composite"; const MAN=process.argv[3]; const LAT=+(process.argv[4]||1.575); const Z=+(process.argv[5]||1.45); fs.mkdirSync(OUT,{recursive:true});
const CAMS=[["live",88,1.25,{x:-130,y:-170,w:260,h:220}],["auth",102.2,2.990127635821332,{x:-190,y:-236,w:448,h:352}]];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-proofc",args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const loaded=await p.evaluate(()=>{ const sp=S.gkAnim.savePoses; const out={}; for(const f in sp) for(const s in sp[f]) out[f+"/"+s]=Object.keys(sp[f][s]); return out; }); console.log("loaded",JSON.stringify(loaded));
const cam=(rail,zoom)=>p.evaluate((rail,zoom)=>{ RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom; },rail,zoom);
const shoot=async(name,rail,zoom,c)=>{ await cam(rail,zoom); await new Promise(r=>setTimeout(r,320)); const sp=await p.evaluate(()=>{ const g=S.pt.gk; const q=sproj3(g.x,0,g.y); return [Math.round(q.x),Math.round(q.y)]; });
  const clip={x:Math.max(0,sp[0]+c.x),y:Math.max(0,sp[1]+c.y),width:c.w,height:c.h}; const f=path.join(OUT,name+".png"); await p.screenshot({path:f,clip}); return {file:path.basename(f),root:[sp[0]-clip.x,sp[1]-clip.y]}; };
const rec={loaded,poses:{}};
// SET reference: keeper set for a central ball, ball parked away, SET state (this is the standing reference in both cameras)
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; ptGkFire({name:"SET", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; for(let i=0;i<40;i++) ptStep(); S.pt.b.x=60; S.pt.b.y=34; S.pt.b.z=0; GK_ANIM.reviewOverride={kind:"state", state:"set", dir:headingToDir(S.pt.gk.facing*180/Math.PI), showLabel:false}; });
rec.set={}; for(const [cn,rail,zoom,c] of CAMS) rec.set[cn]=await shoot(`SET_${cn}`,rail,zoom,c);
for(const [side,sg] of [["GOAL_LEFT",-1],["GOAL_RIGHT",1]]){
  const st=await p.evaluate((laty,z)=>{ ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; GK_ANIM.savePoseIK=false;
    ptGkFire({name:"PROOF", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:laty, z, v:24}}); gkAnimResetView();
    let cm=null; for(let k=0;k<120;k++){ ptStep(); if(S.pt.gk.committed){ cm=S.pt.gk.committed; break; } } if(!cm) return null;
    S.pt.b.x=cm.target[0]; S.pt.b.y=cm.target[1]; S.pt.b.z=cm.target[2]; S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0;
    const g=S.pt.gk; const cls=gkAnimClassify(g,cm,g.facing); return {target:cm.target.map(v=>+v.toFixed(3)), action:cm.action, tier:cm.tier, envNorm:cm.envNorm, family:cls.family, goalSide:cls.goalSide, heightClass:cls.expr&&cls.expr.heightClass, norm:cls.norm, keeper:[+g.x.toFixed(2),+g.y.toFixed(2)], facingDeg:+(g.facing*180/Math.PI).toFixed(1)}; },sg*LAT,Z);
  const pose={sim:st,shots:{}};
  for(const mode of ["clean","diag"]){
    const info=await p.evaluate((side,mode)=>{ const g=S.pt.gk, cm=g.committed; const hs=sproj3(cm.target[0],cm.target[2],cm.target[1]); const simHand={x:hs.x,y:hs.y};
      S.dbg.anim=(mode==="diag"); GK_ANIM.reviewOverride={kind:"savepose", family:"AIRBORNE_DIVE", side, key:"MID", ik:false, simHand, target:(mode==="diag"?cm.target:undefined), showLabel:(mode==="diag"), label:(mode==="diag"?"PERSPECTIVE PROOF RAW":"")};
      const A=S.gkAnim; const smp=A.savePoses.AIRBORNE_DIVE[side].MID; const an=smp.anchors||{}; const sp=sproj3(g.x,0,g.y); const s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
      const gl=an.gloves&&an.gloves.length?an.gloves:[an.lead_glove]; const dx0=Math.round(sp.x-an.root[0]*s), dy0=Math.round(sp.y-an.root[1]*s); const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*s),y:dy0+Math.round(py*s)}),simHand,false);
      return {rawErrSpritePx:+(raw.d2/s).toFixed(1), lead:an.lead_glove, ball_how:an.ball_how}; },side,mode);
    pose.shots[mode]={info,files:{}};
    for(const [cn,rail,zoom,c] of CAMS) pose.shots[mode].files[cn]=await shoot(`${side}_${mode}_${cn}`,rail,zoom,c);
    console.log(side,mode,JSON.stringify(info));
  }
  rec.poses[side]=pose; console.log(side,"sim",JSON.stringify(st));
}
fs.writeFileSync(path.join(OUT,"composite.json"),JSON.stringify(rec,null,1)); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
