// IN-ENGINE CAPTURE of the full prototype animation on the plain page + the candidate frame manifest (?savePoses=...): the simulation
// runs untouched; per tick the review override draws the authored frame chosen by the schedule for the simulation's own phase
// (time since the shot before commit; u during the action; time since endT after it) at the simulation's own root, and hands back to
// the LIVE renderer (override null) inside the contact window so the approved contact pose, its hand-led placement and the live SET
// are exactly today's. Same trace fields as proto_trace.js for a like-for-like comparison.
//   node capture_full.js <outdir> <manifest url path> <schedule json file> '<shot json>'
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const MAN=process.argv[3]; const SCHED=JSON.parse(fs.readFileSync(process.argv[4],"utf8")); const SHOT=JSON.parse(process.argv[5]); const OFF=process.argv.includes("--off"); fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-pfull-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
p.on("console", m=>{ if(/GK|save pose|not loaded/i.test(m.text())) console.log("console:", m.text().slice(0,200)); });
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const keys=await p.evaluate(()=>Object.keys((S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY)||{}));
console.log("candidate keys loaded:", keys.filter(k=>/^F\d/.test(k)).join(" "), "| live contextual:", await p.evaluate(()=>(S.gkAnim.contextual||[]).length));
await p.evaluate((off)=>{ GK_ANIM.sequences=!off; }, OFF); await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  const shot=c.synth?{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c, synth:c.synth}:{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c};
  ptGkFire(shot); gkAnimResetView();
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y); return {sp:[q.x,q.y], root:[gk.x,gk.y], s:S.playerVScale*depthScale(q.d)*RIG.zoom*RES, now:S.pt.now}; }, SHOT);
const CLIP={x:Math.round(start.sp[0])-230, y:Math.round(start.sp[1])-250, width:460, height:330};
const trace=[]; let contactTick=null, committedTick=null, backToSet=null;
for(let f=0; f<320; f++){
  const st=await p.evaluate((S_)=>{ ptStep();
    const gk=S.pt.gk, c=gk.committed; let u=null, key=null, mode="live", ik=false, ikW=1, tSinceShot=S.pt.now, tl=null;
    const pick=(list,v)=>{ for(const x of (list||[])) if(v>=x.from && v<x.to) return x; return null; };
    if(!c){ const fr=pick(S_.preFrames, tSinceShot); if(fr){ key=fr.key; mode="pre"; } }
    else { u=Math.max(0,Math.min(1,(S.pt.now-c.t0)/Math.max(1e-6,c.execTime)));
      const execEnd=c.t0+c.execTime; const ct=gk.contact?gk.contact.tickT:null; const endT=Math.max(execEnd, ct!=null?ct:-1); tl=S.pt.now-endT;
      // contact window: from liveFrom (u) until endT + contactHold — the live renderer owns the approved contact pose through the
      // actual contact tick even when contact lands a tick or two after execEnd (endT moves when the contact is recorded)
      if(S.pt.now<endT+(S_.contactHold||0)){ if(u<S_.liveFrom){ const fr=pick(S_.frames,u); if(fr){ key=fr.key; mode="frame"; ik=!!fr.ik; ikW=fr.ikW!=null?fr.ikW:1; } } }
      else { const pf=pick(S_.postFrames, tl); if(pf){ key=pf.key; mode="post"; } } }
    let off=null, ikPlace=null, pres=null;
    if(key){ const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
      // post-contact frames inherit the contact pose's frozen hand-led placement (exactly what the live LAND does with A.commit.place)
      const pfr=mode==="post"?pick(S_.postFrames, tl):null;
      if(pfr && pfr.carry && S.gkAnim.commit && S.gkAnim.commit.place){ const k=pfr.carry===true?1:+pfr.carry; off={dx:Math.round((S.gkAnim.commit.place.dx||0)*k), dy:Math.round((S.gkAnim.commit.place.dy||0)*k)}; }
      // PRESENTATION ROOT (review prototype only, simulation untouched): after execEnd the simulation root is frozen, but the body still has
      // its dive momentum. Continuation d(t) = V0·τ·(1−e^(−t/τ)) along the dive direction (feet → target on the ground), V0 = the root's mean
      // dive speed (its travel ÷ execTime), τ = S_.pres.tau; from t = pres.tLand it eases back to 0 by pres.tEnd (the keeper walks back to
      // his spot as he gets up, so the live SET at the simulation root is reached without a jump).
      if(mode==="post" && S_.pres && c){ const P=S_.pres; const fx=c.feet[0], fy=c.feet[1]; const ex=gk.x-fx, ey=gk.y-fy; const trav=Math.hypot(ex,ey); const ux=trav>1e-6?ex/trav:0, uy=trav>1e-6?ey/trav:0;
        const V0=trav/Math.max(1e-6,c.execTime); const dLand=V0*P.tau*(1-Math.exp(-P.tLand/P.tau));
        let d; if(tl<=P.tLand) d=V0*P.tau*(1-Math.exp(-tl/P.tau)); else if(tl<P.tEnd) d=dLand*(0.5+0.5*Math.cos(Math.PI*(tl-P.tLand)/(P.tEnd-P.tLand))); else d=0;
        const q0=sproj3(gk.x,0,gk.y), q1=sproj3(gk.x+ux*d,0,gk.y+uy*d); pres={dm:+d.toFixed(4), x:+(gk.x+ux*d).toFixed(4), y:+(gk.y+uy*d).toFixed(4), sx:+(q1.x-q0.x).toFixed(2), sy:+(q1.y-q0.y).toFixed(2), V0:+V0.toFixed(3)};
        if(pfr && pfr.pres!==false){ off={dx:(off?off.dx:0)+Math.round(q1.x-q0.x), dy:(off?off.dy:0)+Math.round(q1.y-q0.y)}; } }
      GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key, ik, ikW, simHand:hn, showLabel:false, dx:off?off.dx:0, dy:off?off.dy:0, shadow:(mode==="post"&&pres)?{sx:pres.sx, sy:pres.sy}:null};
      if(ik && hn){ // reproduce the override's own bounded hand-led placement so the trace knows where the frame was drawn
        const smp=S.gkAnim.savePoses.CONTEXTUAL.ANY[key]; const an=smp.anchors||{}; const sp0=sproj3(gk.x,0,gk.y); const s0=S.playerVScale*depthScale(sp0.d)*RIG.zoom*RES; const ps=s0*(an.pixel_scale||1);
        const ax=an.root[0], ay=an.root[1]; const gl=an.gloves&&an.gloves.length?an.gloves:[an.lead_glove]; const dx0=Math.round(sp0.x-ax*ps), dy0=Math.round(sp0.y-ay*ps);
        const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*ps),y:dy0+Math.round(py*ps)}),hn,false); const pl=gkAnimPlace(raw,hn,ikW,s0,null); ikPlace={dx:pl.dx,dy:pl.dy,raw:pl.rawErrPx,res:pl.finalErrPx,capped:pl.capped}; } }
    else GK_ANIM.reviewOverride=null;
    gkAnimDraw(S.pt,S.pt.gk,1/60);
    const cur=S.gkAnim.cur, sp=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    return {now:+S.pt.now.toFixed(4), root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)], ball:[+bl.x.toFixed(3),+bl.y.toFixed(3),+bl.z.toFixed(3)],
      u:u!=null?+u.toFixed(4):null, tl:tl!=null?+tl.toFixed(4):null, drawn:key||"LIVE", mode, ik, off, ikPlace, pres, committed:!!c, state:gk.state, phase:gk.phase, contact:gk.contact?{tickT:gk.contact.tickT,outcome:gk.contact.outcome}:null,
      anim:cur?{state:cur.state, phase:cur.phase, art:cur.artLabel, place:cur.place?{dx:cur.place.dx,dy:cur.place.dy,raw:cur.place.rawErrPx,res:cur.place.finalErrPx}:null}:null}; }, SCHED);
  await new Promise(r=>setTimeout(r,30));
  await p.screenshot({path:path.join(OUT,"new_"+String(f).padStart(3,"0")+".png"), clip:CLIP});
  trace.push({f, ...st});
  if(st.committed&&committedTick==null) committedTick=f;
  if(st.contact&&contactTick==null) contactTick=f;
  if(contactTick!=null && backToSet==null && st.drawn==="LIVE" && st.anim && (st.anim.state==="SET"||st.anim.state==="IDLE") && f>contactTick+10) backToSet=f;
  if(backToSet!=null && f>backToSet+12) break;
  if(committedTick!=null && contactTick==null && f>committedTick+90) break;
}
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
fs.writeFileSync(path.join(OUT,"trace.json"), JSON.stringify({shot:SHOT, start, clip:CLIP, committedTick, contactTick, backToSet, sched:SCHED, trace},null,1));
console.log("committed", committedTick, "contact", contactTick, "backToSet", backToSet, "frames", trace.length);
console.log("drawn sequence:", trace.map(t=>t.drawn+(t.mode==="live"?"("+((t.anim||{}).art||"").slice(0,22)+")":"")).filter((v,i,a)=>i===0||v!==a[i-1]).join(" -> "));
await b.close();})();
