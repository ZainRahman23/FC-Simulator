// SALVAGE REVIEW SHEET v2 — real synthetic shots on the real page: the keeper positions itself, reacts, commits and dives; the
// simulation is paused at its own contact tick (pause-at-contact aid). The ASSIGNED pose is drawn by the review override at the real
// contact root with the real ball at the real contact; the live selector's own pick (no override) is logged alongside.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"sheet2"; fs.mkdirSync(OUT,{recursive:true});
const URL="http://127.0.0.1:8126/sandbox/visual/match.html?plain=1";
const CASES=[
 {id:"S_NEAR", pose:"TIGHT_S_NEAR_TOP", origin:[103.5,46], tgtY:37.2, z:2.25, label:"SOUTH tight angle — near/top corner"},
 {id:"S_FAR",  pose:"TIGHT_S_FAR_TOP",  origin:[103.5,46], tgtY:30.9, z:2.25, label:"SOUTH tight angle — far/top corner"},
 {id:"N_NEAR", pose:"TIGHT_N_NEAR_TOP", origin:[103.5,22], tgtY:30.8, z:2.25, label:"NORTH tight angle — near/top corner"},
 {id:"N_FAR",  pose:"TIGHT_N_FAR_TOP",  origin:[103.5,22], tgtY:37.1, z:2.25, label:"NORTH tight angle — far/top corner"},
 {id:"OVER_0", pose:"OVERHEAD_REACH",      origin:[85,34], tgtY:null, z:2.35, label:"OVERHEAD — original GK_POSE_148"},
 {id:"OVER_11",pose:"OVERHEAD_REACH_CW11", origin:[85,34], tgtY:null, z:2.35, label:"OVERHEAD — GK_POSE_148 re-angled 11° clockwise (transform)"},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-salv2-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1}); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto(URL+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("contextual:",await p.evaluate(()=>(S.gkAnim.contextual||[]).map(c=>c.id)));
// warm-up: the very first screenshot after entering the playtest came back black (canvas not yet painted); run one throwaway pass
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400)); await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:200,height:150}}); await new Promise(r=>setTimeout(r,200));
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    // place the keeper for this shooter (Stage-1 position, SET), let two real ticks set the facing, then fire the synthetic ball
    ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const gk=S.pt.gk; const lat = c.tgtY==null ? 0 : c.tgtY-gk.y; const facingBefore=gk.facing;
    ptGkFire({name:"SALV "+c.id, origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat, z:c.z, v:19}}); gkAnimResetView();
    S.pt.paused=false; let ticks=0, contactTick=null, commitTick=null, ctxAtCommit=null, clsAtCommit=null, committedRec=null;
    while(ticks<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); ticks++;
      if(S.pt.gk.committed && commitTick===null){ commitTick=ticks; committedRec=S.pt.gk.committed; }
      if(S.gkAnim.commit && S.gkAnim.commit.ctx!==undefined && ctxAtCommit===null){ ctxAtCommit=S.gkAnim.commit.ctx; clsAtCommit=S.gkAnim.commit.cls; }
      if(S.pt.gk.contact){ contactTick=ticks; break; } if(S.pt.paused) break;
      if(committedRec && !S.pt.gk.contact && S.pt.now >= committedRec.t0 + committedRec.execTime) break;   // no contact possible: stop at the end of the reach
    }
    const A=S.gkAnim, cur=A.cur, cm={ctx:ctxAtCommit, cls:clsAtCommit}, ct=committedRec; const q=sproj3(gk.x,0,gk.y); const bl=S.pt.b;
    const shooter=[S.pt.p.x,S.pt.p.y]; const attackerDeg=Math.atan2(shooter[1]-34,-(shooter[0]-105))*180/Math.PI;
    return {ticks, contactTick, commitTick, root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)], facingDeg:+(facingBefore*180/Math.PI).toFixed(1), facingBin:headingToDir(facingBefore*180/Math.PI), attackerDeg:+attackerDeg.toFixed(1),
      committed: ct ? {target:ct.target.map(v=>+v.toFixed(2)), feet:ct.feet.map(v=>+v.toFixed(2)), tier:ct.tier, bestEffort:ct.bestEffort, action:ct.action, envNorm:ct.envNorm} : null,
      cls: cm&&cm.cls ? {family:cm.cls.family, hClass:cm.cls.hClass, goalSide:cm.cls.goalSide, lat:cm.cls.lat, dz:cm.cls.dz, L:cm.cls.L, norm:cm.cls.norm} : null,
      ctx: cm ? cm.ctx : null, liveArt: cur ? cur.artLabel : null, liveState: cur ? cur.state : null, contact: S.pt.gk.contact ? {outcome:S.pt.gk.contact.outcome, volume:S.pt.gk.contact.volume} : null }; }, c);
  await p.evaluate((pose)=>{ GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:pose, showLabel:false}; }, c.pose);
  await new Promise(r=>setTimeout(r,150)); const clip={x:Math.round(g.sp[0])-120,y:Math.round(g.sp[1])-125,width:240,height:165}; await p.screenshot({path:path.join(OUT,c.id+"_assigned.png"),clip});
  await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,150)); await p.screenshot({path:path.join(OUT,c.id+"_live.png"),clip});
  const tsp=await p.evaluate(()=>{ const b=S.pt.b; const q=sproj3(b.x,b.z,b.y); const f=sproj3(S.pt.gk.x,0,S.pt.gk.y); return {ball:[+q.x.toFixed(1),+q.y.toFixed(1)], feet:[+f.x.toFixed(1),+f.y.toFixed(1)]}; });
  rec.push({...c,...g,screen:tsp,file:c.id+"_assigned.png",fileLive:c.id+"_live.png"});
  console.log(c.id, "| ticks",g.ticks,"contact",g.contactTick, g.contact, "| root",g.root,"facing",g.facingDeg,g.facingBin,"attacker",g.attackerDeg,"| committed",g.committed&&g.committed.target,g.committed&&g.committed.tier,"| cls",g.cls,"| ctx pick",g.ctx&&g.ctx.pick?g.ctx.pick.id+" "+g.ctx.pick.score+" ("+g.ctx.pick.why+")":"none", "situation",g.ctx&&g.ctx.situation,"baseline",g.ctx&&g.ctx.baseline,"| live art:",g.liveArt);
}
fs.writeFileSync(path.join(OUT,"cases.json"),JSON.stringify(rec,null,1)); console.log("errors:",errs.slice(0,4)); await b.close();})();
