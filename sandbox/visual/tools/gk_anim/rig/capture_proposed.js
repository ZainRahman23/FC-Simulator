// IN-ENGINE CAPTURE of a proposed multi-frame dive on the plain page + a candidate save-pose manifest (?savePoses=...): the simulation
// runs untouched; per tick the review override draws the authored frame chosen for the simulation's own phase u at the simulation's own
// root (the renderer's blit, scale and camera), and hands back to the LIVE renderer (override null) from `liveFrom` so the existing
// contact pose, hand-led placement, LAND and RECOVER are exactly today's. Records the same trace as trace_dive.js for a like-for-like check.
//   node capture_proposed.js <outdir> <manifest url path> <schedule json> real|synth|'<shot json>'
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const MAN=process.argv[3]; const SCHED=JSON.parse(fs.readFileSync(process.argv[4],"utf8")); const MODE=process.argv[5]||"synth"; fs.mkdirSync(OUT,{recursive:true});
const SHOT = MODE==="real" ? {id:"REAL_B", origin:[90,38], aim:[105,31.0], tech:"POWER", c:0.75}
           : MODE==="synth" ? {id:"NORTH_MEDHIGH", origin:[101.7-20,34], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:-2.0,z:1.45,v:25}}
           : JSON.parse(MODE);
// SCHED: {liveFrom: u, frames:[{key, from:u, to:u, ik:false}], postFrames:[{key, fromT: seconds after execEnd, toT}], hideKeeperKey}
function pick(u){ for(const f of SCHED.frames) if(u>=f.from && u<f.to) return f; return null; }
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-prop-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
p.on("console", m=>{ if(/GK|save pose|not loaded/i.test(m.text())) console.log("console:", m.text().slice(0,200)); });
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const keys=await p.evaluate(()=>Object.keys((S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY)||{}));
console.log("candidate keys loaded:", keys.filter(k=>/^F\d|BLANK/.test(k)).join(" "), "| live contextual:", await p.evaluate(()=>(S.gkAnim.contextual||[]).length));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  const shot=c.synth?{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c, synth:c.synth}:{name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c};
  ptGkFire(shot); gkAnimResetView();
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y); return {sp:[q.x,q.y], root:[gk.x,gk.y]}; }, SHOT);
const CLIP={x:Math.round(start.sp[0])-230, y:Math.round(start.sp[1])-250, width:460, height:330};
const trace=[]; let contactTick=null, committedTick=null, execEnd=null;
for(let f=0; f<150; f++){
  // advance the simulation first, then decide the presentation for this tick from the simulation's own state
  const st=await p.evaluate((S_)=>{ ptStep();
    const gk=S.pt.gk, c=gk.committed; let u=null, key=null, mode="live";
    if(c){ u=Math.max(0,Math.min(1,(S.pt.now-c.t0)/Math.max(1e-6,c.execTime)));
      const endT=c.t0+c.execTime; const tl=S.pt.now-endT;
      if(u<S_.liveFrom){ const fr=S_.frames.find(x=>u>=x.from&&u<x.to); if(fr){ key=fr.key; mode="frame"; } }
      else if(S_.postFrames && tl>=0){ const pf=S_.postFrames.find(x=>tl>=x.fromT&&tl<x.toT); if(pf){ key=pf.key; mode="post"; } }
    }
    if(key){ const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null; GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key, ik:false, simHand:hn, showLabel:false}; }
    else GK_ANIM.reviewOverride=null;
    gkAnimDraw(S.pt,S.pt.gk,1/60);
    const cur=S.gkAnim.cur, sp=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    return {now:+S.pt.now.toFixed(4), root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)],
      u:u!=null?+u.toFixed(4):null, drawn:key||"LIVE", mode, committed:!!c, execEnd:c?+(c.t0+c.execTime).toFixed(4):null, contact:gk.contact?{tickT:gk.contact.tickT,outcome:gk.contact.outcome}:null,
      anim:cur?{state:cur.state, art:cur.artLabel}:null}; }, SCHED);
  await new Promise(r=>setTimeout(r,40));
  await p.screenshot({path:path.join(OUT,"prop_"+String(f).padStart(3,"0")+".png"), clip:CLIP});
  trace.push({f, ...st});
  if(st.committed&&committedTick==null) committedTick=f;
  if(st.contact&&contactTick==null) contactTick=f;
  if(contactTick!=null && f>contactTick+75) break;
}
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
fs.writeFileSync(path.join(OUT,"trace.json"), JSON.stringify({shot:SHOT, start, clip:CLIP, committedTick, contactTick, sched:SCHED, trace},null,1));
console.log("committed", committedTick, "contact", contactTick, "frames", trace.length);
console.log("drawn sequence:", trace.map(t=>t.drawn).filter((v,i,a)=>i===0||v!==a[i-1]).join(" -> "));
await b.close();})();
