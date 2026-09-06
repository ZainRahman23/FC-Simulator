// SOUTH V6 (mirrored, scale-calibrated) in the ACTUAL gameplay camera, before any integration: a candidate manifest is loaded with
// ?savePoses=, representative GOAL_RIGHT dives run on the untouched simulation and pause at their own contact tick, and the candidate is
// drawn through the review override exactly as the live save-pose path would draw it (same blit, sprite scale x pixel_scale, hand-led
// placement), next to what plays today and the SET keeper at the same root. Also a scale bracket for the user's visual call.
//   node south_v6_review.js <outdir> <manifest url path> <key> [bracket scales csv]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const MAN=process.argv[3]; const KEY=process.argv[4]||"SOUTH_V6"; const BRACKET=(process.argv[5]||"").split(",").filter(Boolean).map(Number); fs.mkdirSync(OUT,{recursive:true});
const CASES=[{id:"HIGH", lat:2.0, z:1.45, v:25, label:"GOAL_RIGHT HIGH far dive (lat +2.0 m, z 1.45 m) — the representative anchoring case"},
             {id:"MID",  lat:2.0, z:1.00, v:25, label:"GOAL_RIGHT MID far dive (lat +2.0 m, z 1.00 m)"},
             {id:"REAL_S", origin:[88,32], aim:[105,37.1], tech:"POWER", c:0.8, label:"real POWER kick aimed at the near (south) side"}];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-sv6-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
p.on("console", m=>{ if(/not loaded|GK save/i.test(m.text())) console.log("console:", m.text().slice(0,200)); });
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const loaded=await p.evaluate((k)=>{const a=S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY&&S.gkAnim.savePoses.CONTEXTUAL.ANY[k]; return a?{anchors:a.anchors, w:a.img.width, h:a.img.height, mirror:a.mirror}:null;}, KEY);
console.log("candidate", KEY, loaded?JSON.stringify({root:loaded.anchors.root, pixel_scale:loaded.anchors.pixel_scale, lead:loaded.anchors.lead_glove, canvas:[loaded.w,loaded.h]}):"NOT LOADED");
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=c.origin||[101.7-20,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const shot=c.synth!==undefined||c.lat!==undefined?{name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}:{name:c.id, origin, aim:c.aim, tech:c.tech, c:c.c};
    ptGkFire(shot); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null; while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(gk.contact||S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(q.d)*RIG.zoom*RES, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y);
    const cls=S.gkAnim.commit&&S.gkAnim.commit.cls; const ctx=S.gkAnim.commit&&S.gkAnim.commit.ctx&&S.gkAnim.commit.ctx.pick;
    return {sp:[+q.x.toFixed(2),+q.y.toFixed(2)], s:+s.toFixed(5), handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)], dir:headingToDir(gk.facing*180/Math.PI),
      committed: committed?{tier:committed.tier, action:committed.action, target:committed.target.map(v=>+v.toFixed(3)), execTime:+committed.execTime.toFixed(3)}:null,
      contact: gk.contact?{outcome:gk.contact.outcome, volume:gk.contact.volume}:null, cls: cls?{family:cls.family,hClass:cls.hClass,goalSide:cls.goalSide,norm:cls.norm}:null,
      livePick: ctx?{id:ctx.id,score:ctx.score}:null, liveArt: cur&&cur.artLabel, target: committed?committed.target:null}; }, c);
  const WIDE={x:Math.round(g.sp[0])-260, y:Math.round(g.sp[1])-250, width:620, height:360};
  const TIGHT={x:Math.round(g.sp[0])-110, y:Math.round(g.sp[1])-130, width:220, height:180};
  async function shot(name, clip){ await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,c.id+"_"+name+".png"), clip}); }
  // A: what plays today
  await shot("A_live_wide", WIDE); await shot("A_live", TIGHT);
  // B: the candidate as the live path would draw it (hand-led placement) + the simulation's contact target marker
  const pl=await p.evaluate((k,tg)=>{ const gk=S.pt.gk, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:k, ik:true, simHand:hn, target:tg, showLabel:false};
    // replicate the placement numbers the live path would report
    const smp=S.gkAnim.savePoses.CONTEXTUAL.ANY[k], an=smp.anchors, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES, ps=s*(an.pixel_scale||1);
    const ax=an.root[0], ay=an.root[1], gl=an.gloves&&an.gloves.length?an.gloves:[an.lead_glove];
    const dx0=Math.round(sp.x-ax*ps), dy0=Math.round(sp.y-ay*ps); const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*ps),y:dy0+Math.round(py*ps)}),hn,false); const r=gkAnimPlace(raw,hn,1,s,null);
    return {rawErrPx:r.rawErrPx, corrPx:r.corrPx, finalErrPx:r.finalErrPx, capped:r.capped, dx:r.dx, dy:r.dy}; }, KEY, g.target);
  await shot("B_candidate_IK_wide", WIDE); await shot("B_candidate_IK", TIGHT);
  await p.evaluate((k)=>{ GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:k, ik:false, showLabel:false}; }, KEY);
  await shot("C_candidate_RAW", TIGHT);
  await p.evaluate((d)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir:d, showLabel:false}; }, g.dir);
  await shot("D_SET_same_root", TIGHT);
  // bracket: same pose at alternative body scales (root re-derived from the lead glove + canonical offset, exactly like the builder)
  const br={};
  for(const sc of BRACKET){
    const info=await p.evaluate((k,sc)=>{ const an=S.gkAnim.savePoses.CONTEXTUAL.ANY[k].anchors; const keep={ps:an.pixel_scale, root:an.root.slice()};
      const off=an.root_offset_base_px, lead=an.lead_glove; an.pixel_scale=sc; an.root=[+(lead[0]+off[0]/sc).toFixed(1), +(lead[1]+off[1]/sc).toFixed(1)];
      const gk=S.pt.gk, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null; GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:k, ik:true, simHand:hn, showLabel:false}; return keep; }, KEY, sc);
    await shot("E_scale_"+sc.toFixed(2), TIGHT);
    await p.evaluate((k,keep)=>{ const an=S.gkAnim.savePoses.CONTEXTUAL.ANY[k].anchors; an.pixel_scale=keep.ps; an.root=keep.root; }, KEY, info);
    br[sc]=true;
  }
  await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
  rec.push({...c, ...g, placement:pl, wide:WIDE, tight:TIGHT});
  console.log(`${c.id}: ${g.cls?g.cls.family+" "+g.cls.hClass+" "+g.cls.goalSide+" norm "+g.cls.norm:"-"} | today: ${g.liveArt} | contact ${g.contact?g.contact.volume+" "+g.contact.outcome:"none"} | candidate placement raw ${pl.rawErrPx} corr ${pl.corrPx} res ${pl.finalErrPx}px${pl.capped?" CAPPED":""} | s ${g.s}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();
