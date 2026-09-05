// LOCOMOTION CAPTURE: SET (idle) and SHUFFLE presentation for W / SW / NW on the real renderer, plus facing transitions.
// Uses the review override (read-only for the simulation). node loco_capture.js <outdir> [tag]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"loco"; const TAG=process.argv[3]||""; fs.mkdirSync(OUT,{recursive:true});
const DIRS=["west","south-west","north-west"]; const CAMS=[["live",88,1.25,{x:-70,y:-90,w:140,h:120}],["auth",102.2,2.990127635821332,{x:-110,y:-150,w:220,h:200}]];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-loco-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; ptGkFire({name:"LOCO", origin:[88,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; for(let i=0;i<40;i++) ptStep(); S.pt.b.x=60; S.pt.b.y=34; });
const cam=(rail,zoom)=>p.evaluate((rail,zoom)=>{ RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom; },rail,zoom);
const shot=async(name,c)=>{ await new Promise(r=>setTimeout(r,140)); const sp=await p.evaluate(()=>{ const g=S.pt.gk; const q=sproj3(g.x,0,g.y); return [Math.round(q.x),Math.round(q.y)]; }); const clip={x:Math.max(0,sp[0]+c.x),y:Math.max(0,sp[1]+c.y),width:c.w,height:c.h}; const f=path.join(OUT,name+".png"); await p.screenshot({path:f,clip}); return {file:path.basename(f),root:[sp[0]-clip.x,sp[1]-clip.y]}; };
const rec={set:{},shuffle:{},transitions:{},info:{}};
for(const [cn,rail,zoom,c] of CAMS){ await cam(rail,zoom); await new Promise(r=>setTimeout(r,300));
  for(const d of DIRS){
    await p.evaluate((d)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir:d, showLabel:false}; },d);
    rec.set[`${d}_${cn}`]=await shot(`SET_${d}_${cn}${TAG}`,c);
    const n=await p.evaluate(()=>{ const c=S.gkAnim.clips.shuffle; return c?c.variants[0].frames.length:0; });
    const info=await p.evaluate((d)=>{ const c=S.gkAnim.clips.shuffle; const r=gkAnimResolve(c,d,"RIGHT"); return r?{variant:r.v.dir, mirrored:r.mirrored, sideApprox:r.sideApprox, dirSteps:r.dirSteps, frames:r.v.frames.length}:null; },d);
    rec.info[`shuffle_${d}`]=info; rec.shuffle[`${d}_${cn}`]=[];
    for(let k=0;k<n;k++){ await p.evaluate((d,k)=>{ GK_ANIM.reviewOverride={kind:"clip", clip:"shuffle", dir:d, side:"RIGHT", pos:k, showLabel:false}; },d,k); rec.shuffle[`${d}_${cn}`].push(await shot(`SHUFFLE_${d}_${cn}_f${k}${TAG}`,c)); }
  }
  // transitions: SET west → south-west → west and west → north-west → west, plus the same mid-shuffle (frame 3)
  for(const seq of [["west","south-west","west"],["west","north-west","west"]]){
    const key=seq.join(">")+"_"+cn; rec.transitions[key]=[];
    for(const d of seq){ await p.evaluate((d)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir:d, showLabel:false}; },d); rec.transitions[key].push(await shot(`TR_SET_${seq.join("-")}_${d}_${cn}${TAG}_${rec.transitions[key].length}`,c)); }
    for(const d of seq){ await p.evaluate((d)=>{ GK_ANIM.reviewOverride={kind:"clip", clip:"shuffle", dir:d, side:"RIGHT", pos:3, showLabel:false}; },d); rec.transitions[key].push(await shot(`TR_SHUF_${seq.join("-")}_${d}_${cn}${TAG}_${rec.transitions[key].length}`,c)); }
  }
}
fs.writeFileSync(path.join(OUT,"loco.json"),JSON.stringify({rec,errors:errs},null,1)); console.log("shuffle resolution:",JSON.stringify(rec.info)); console.log("errors",JSON.stringify(errs.slice(0,3))); await b.close();})();
