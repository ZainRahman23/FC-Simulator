// REAL DIVE TRACE on the plain default page: runs one shot, records the simulation's keeper root / hand / phase every tick, the
// renderer's sprite scale and screen positions, and captures the CURRENT live presentation frame by frame (the baseline the
// experimental multi-frame animation is compared against). Nothing in the runtime is modified.
//   node trace_dive.js <outdir> [real|synth]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
//   node trace_dive.js <outdir> real|synth|'<shot json>' [--noshots]
const OUT=process.argv[2]||"dive_trace"; const MODE=process.argv[3]||"real"; const NOSHOTS=process.argv.includes("--noshots"); fs.mkdirSync(OUT,{recursive:true});
const SHOT = MODE==="real" ? {id:"REAL_B", origin:[90,38], aim:[105,31.0], tech:"POWER", c:0.75}
           : MODE==="synth" ? {id:"NORTH_MEDHIGH", origin:[101.7-20,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:-2.0,z:1.45,v:25}}
           : JSON.parse(MODE);
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-trace-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  const shot=c.synth?{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c, synth:c.synth}:{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c};
  ptGkFire(shot); gkAnimResetView();
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y); return {sp:[q.x,q.y], root:[gk.x,gk.y], s:S.playerVScale*depthScale(q.d)*RIG.zoom*RES, height:gk.height, handZ:gk.handZ, facing:gk.facing}; }, SHOT);
const CLIP={x:Math.round(start.sp[0])-230, y:Math.round(start.sp[1])-250, width:460, height:330};
const trace=[]; let contactTick=null, committedTick=null;
for(let f=0; f<150; f++){
  const st=await p.evaluate(()=>{ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
    const gk=S.pt.gk, cur=S.gkAnim.cur, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES, bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y);
    const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    const c=gk.committed;
    return {now:+S.pt.now.toFixed(4), root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], vx:+gk.vx.toFixed(3), vy:+gk.vy.toFixed(3), phase:gk.phase, sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], s:+s.toFixed(5),
      hand:gk.handNow?gk.handNow.map(v=>+v.toFixed(4)):null, handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, legTip:gk.legTipNow?gk.legTipNow.map(v=>+v.toFixed(3)):null,
      ball:[+bl.x.toFixed(3),+bl.y.toFixed(3),+bl.z.toFixed(3)], ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)], held:bl.held||null,
      committed:c?{t0:+c.t0.toFixed(4), execTime:+c.execTime.toFixed(4), tier:c.tier, action:c.action, bestEffort:c.bestEffort, target:c.target.map(v=>+v.toFixed(4)), feet:c.feet.map(v=>+v.toFixed(4)), handOrigin:c.handOrigin.map(v=>+v.toFixed(4)), actionDetail:c.actionDetail, envNorm:c.envNorm, diveSpanMax:c.diveSpanMax}:null,
      diveU:gk.diveU!=null?+gk.diveU.toFixed(4):null, contact:gk.contact?{tickT:gk.contact.tickT, outcome:gk.contact.outcome, volume:gk.contact.volume, point:gk.contact.point}:null,
      anim:cur?{state:cur.state, phase:cur.phase, u:cur.u, family:cur.family, side:cur.side, dir:cur.dir, art:cur.artLabel, cls:cur.cls?{family:cur.cls.family,hClass:cur.cls.hClass,goalSide:cur.cls.goalSide,norm:cur.cls.norm,L:cur.cls.L,zH:cur.cls.zH,saveAngle:cur.cls.saveAngle}:null, place:cur.place?{dx:cur.place.dx,dy:cur.place.dy,raw:cur.place.rawErrPx,res:cur.place.finalErrPx}:null, ctx:(S.gkAnim.commit&&S.gkAnim.commit.ctx&&S.gkAnim.commit.ctx.pick)?{id:S.gkAnim.commit.ctx.pick.id,score:S.gkAnim.commit.ctx.pick.score}:null}:null}; });
  if(!NOSHOTS){ await new Promise(r=>setTimeout(r,40)); await p.screenshot({path:path.join(OUT,"cur_"+String(f).padStart(3,"0")+".png"), clip:CLIP}); }
  trace.push({f, ...st});
  if(st.committed&&committedTick==null) committedTick=f;
  if(st.contact&&contactTick==null) contactTick=f;
  if(contactTick!=null && f>contactTick+75) break;
  if(NOSHOTS && st.anim && st.anim.state==="SET" && committedTick!=null && f>committedTick+20) break;
}
fs.writeFileSync(path.join(OUT,"trace.json"), JSON.stringify({shot:SHOT, start, clip:CLIP, committedTick, contactTick, trace},null,1));
const c=trace.find(t=>t.committed); const ct=trace.find(t=>t.contact);
console.log("committed at frame", committedTick, c?JSON.stringify(c.committed):"-");
console.log("contact at frame", contactTick, ct?JSON.stringify(ct.contact):"-");
console.log("anim states:", trace.map(t=>t.anim?t.anim.state:"?").filter((v,i,a)=>i===0||v!==a[i-1]).join(" -> "));
const sw=trace.findIndex(t=>t.anim&&/SAVE POSE/.test(t.anim.art||""));
console.log("save pose first drawn at frame", sw, sw>=0?trace[sw].anim.art:"");
console.log("frames captured", trace.length, "clip", JSON.stringify(CLIP));
await b.close();})();
