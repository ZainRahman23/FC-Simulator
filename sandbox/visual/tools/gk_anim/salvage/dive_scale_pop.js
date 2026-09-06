// NO-SIZE-POP CHECK: step one north dive frame by frame through the SET → dive-pose switch on the plain default page, capturing the
// gameplay frame and the drawn stature the renderer uses (standing sprite height vs the dive art's body axis at its own body scale).
//   node dive_scale_pop.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"pop"; fs.mkdirSync(OUT,{recursive:true});
const CASE={lat:-2.0, z:1.45, v:25}, BODY_AXIS_PX=141.5, SET_HEIGHT_PX=102;   // measured stature of each art (head-to-toe / head-to-foot)
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-pop-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  const origin=[101.7-20,34];
  ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  ptGkFire({name:"DIVE NORTH", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView();
  const q=sproj3(S.pt.gk.x,0,S.pt.gk.y); return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)]}; }, CASE);
const CLIP={x:Math.round(start.sp[0])-150, y:Math.round(start.sp[1])-170, width:300, height:230};
const trace=[];
for(let f=0; f<44; f++){
  const st=await p.evaluate((k)=>{ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
    const gk=S.pt.gk, cur=S.gkAnim.cur, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
    const an=cur&&cur.savePose?(cur.savePose.sample.anchors||{}):null;
    const drawing = cur && cur.savePose && cur.u >= cur.savePose.showFrom ? "dive pose" : "SET";
    const stature = drawing === "dive pose" ? s*(an.pixel_scale||1)*k.BODY : s*k.SET;
    return {drawing, u:cur?+cur.u.toFixed(3):null, s:+s.toFixed(4), pixelScale:an?(an.pixel_scale||1):null, statureScreenPx:+stature.toFixed(2), art:cur?cur.artLabel:null}; }, {BODY:BODY_AXIS_PX, SET:SET_HEIGHT_PX});
  await new Promise(r=>setTimeout(r,60));
  await p.screenshot({path:path.join(OUT,"f"+String(f).padStart(2,"0")+".png"), clip:CLIP});
  trace.push({f, ...st});
}
fs.writeFileSync(path.join(OUT,"trace.json"), JSON.stringify({clip:CLIP, trace},null,1));
const sw=trace.findIndex(t=>t.drawing==="dive pose");
console.log("switch at frame", sw);
for(const t of trace.slice(Math.max(0,sw-3), sw+4)) console.log(` f${String(t.f).padStart(2)} ${t.drawing.padEnd(9)} u ${t.u} scale ${t.s} x${t.pixelScale||1} -> drawn stature ${t.statureScreenPx} px`);
const before=trace.filter(t=>t.drawing==="SET").map(t=>t.statureScreenPx), after=trace.filter(t=>t.drawing==="dive pose").map(t=>t.statureScreenPx);
if(before.length&&after.length){ const b0=before[before.length-1], a0=after[0];
  console.log("stature before switch", b0, "after", a0, "-> pop", (100*Math.abs(a0-b0)/b0).toFixed(1)+"%"); }
await b.close();})();
