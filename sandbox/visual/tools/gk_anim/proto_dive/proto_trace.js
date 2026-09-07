// PROTOTYPE DIVE — full trace of ONE reproducible save on the plain page: every tick from the shot through commit, contact, LAND,
// RECOVER and the return to SET. Records the simulation's keeper root / hand / phases, the ball, and the CURRENT presentation
// (state, art, drawn anchors) + a screenshot per tick. Nothing in the runtime is modified.
//   node proto_trace.js <outdir> '<shot json>' [--noshots] [--pad N]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const SHOT=JSON.parse(process.argv[3]); const NOSHOTS=process.argv.includes("--noshots"); const OFF=process.argv.includes("--off"); fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-ptrace-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate((off)=>{ GK_ANIM.sequences=!off; }, OFF); await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  const shot=c.synth?{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c, synth:c.synth}:{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c};
  ptGkFire(shot); gkAnimResetView();
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y); return {sp:[q.x,q.y], root:[gk.x,gk.y], s:S.playerVScale*depthScale(q.d)*RIG.zoom*RES, height:gk.height, handZ:gk.handZ, facing:gk.facing, shotT0:gk.shotT0, now:S.pt.now}; }, SHOT);
const CLIP={x:Math.round(start.sp[0])-230, y:Math.round(start.sp[1])-250, width:460, height:330};
const trace=[]; let contactTick=null, committedTick=null, backToSet=null;
for(let f=0; f<320; f++){
  const st=await p.evaluate(()=>{ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
    const gk=S.pt.gk, cur=S.gkAnim.cur, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES, bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y);
    const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null; const c=gk.committed;
    const A=S.gkAnim; const an=cur&&cur.anchors?cur.anchors:null; const P=(q)=>q?[+q.x.toFixed(2),+q.y.toFixed(2)]:null;
    return {now:+S.pt.now.toFixed(4), root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], vx:+gk.vx.toFixed(3), vy:+gk.vy.toFixed(3), state:gk.state, phase:gk.phase, facing:+(gk.facing*180/Math.PI).toFixed(1), shotT0:gk.shotT0, shotActive:!!gk.shotActive,
      sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], s:+s.toFixed(5),
      hand:gk.handNow?gk.handNow.map(v=>+v.toFixed(4)):null, handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, legTip:gk.legTipNow?gk.legTipNow.map(v=>+v.toFixed(3)):null,
      ball:[+bl.x.toFixed(3),+bl.y.toFixed(3),+bl.z.toFixed(3)], ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)], held:bl.held||null,
      committed:c?{t0:+c.t0.toFixed(4), execTime:+c.execTime.toFixed(4), commitTick:c.commitTick, tier:c.tier, action:c.action, bestEffort:c.bestEffort, target:c.target.map(v=>+v.toFixed(4)), feet:c.feet.map(v=>+v.toFixed(4)), handOrigin:c.handOrigin?c.handOrigin.map(v=>+v.toFixed(4)):null, actionDetail:c.actionDetail, envNorm:c.envNorm, diveSpanMax:c.diveSpanMax, gather:!!c.gather}:null,
      diveU:gk.diveU!=null?+gk.diveU.toFixed(4):null, contact:gk.contact?{tickT:gk.contact.tickT, outcome:gk.contact.outcome, volume:gk.contact.volume, point:gk.contact.point}:null,
      anim:cur?{state:cur.state, phase:cur.phase, u:cur.u, family:cur.family, side:cur.side, dir:cur.dir, art:cur.artLabel, place:cur.place?{dx:cur.place.dx,dy:cur.place.dy,raw:cur.place.rawErrPx,res:cur.place.finalErrPx,capped:cur.place.capped}:null,
        anchors:an?{root:P(an.root),pelvis:P(an.pelvis),head:P(an.head),handL:P(an.handL),handR:P(an.handR),footL:P(an.footL),footR:P(an.footR)}:null,
        ctx:(A.commit&&A.commit.ctx&&A.commit.ctx.pick)?{id:A.commit.ctx.pick.id,score:A.commit.ctx.pick.score}:null}:null}; });
  if(!NOSHOTS){ await new Promise(r=>setTimeout(r,30)); await p.screenshot({path:path.join(OUT,"cur_"+String(f).padStart(3,"0")+".png"), clip:CLIP}); }
  trace.push({f, ...st});
  if(st.committed&&committedTick==null) committedTick=f;
  if(st.contact&&contactTick==null) contactTick=f;
  if(contactTick!=null && backToSet==null && st.anim && (st.anim.state==="SET"||st.anim.state==="IDLE") && f>contactTick+10) backToSet=f;
  if(backToSet!=null && f>backToSet+12) break;
  if(committedTick!=null && contactTick==null && f>committedTick+90) break;
}
fs.writeFileSync(path.join(OUT,"trace.json"), JSON.stringify({shot:SHOT, start, clip:CLIP, committedTick, contactTick, backToSet, trace},null,1));
const c=trace.find(t=>t.committed); const ct=trace.find(t=>t.contact);
console.log("shot fired at now", start.now, "shotT0", start.shotT0, "| keeper start", JSON.stringify(start.root), "facing", (start.facing*180/Math.PI).toFixed(1));
console.log("committed at frame", committedTick, c?JSON.stringify(c.committed):"-");
console.log("contact at frame", contactTick, ct?JSON.stringify(ct.contact):"-", "| back to SET at frame", backToSet);
console.log("sim states:", trace.map(t=>t.state+"/"+t.phase).filter((v,i,a)=>i===0||v!==a[i-1]).join(" -> "));
console.log("anim states:", trace.map(t=>t.anim?t.anim.state+"|"+t.anim.phase:"?").filter((v,i,a)=>i===0||v!==a[i-1]).join(" -> "));
const arts=trace.map(t=>t.anim?(t.anim.art||"").slice(0,60):"?").filter((v,i,a)=>i===0||v!==a[i-1]); console.log("art sequence:", arts.join("  ->  "));
console.log("frames", trace.length, "clip", JSON.stringify(CLIP));
await b.close();})();
