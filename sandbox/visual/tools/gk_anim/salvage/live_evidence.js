// LIVE EVIDENCE on the DEFAULT page: no manifest parameter, no override, no forced state. Real shots through the normal charge-launch path
// from a placed shooter; the simulation positions, reads, commits, reaches; paused at its own contact tick (or the end of an unreachable
// reach). The crop shows what the live runtime drew on its own; a second crop shows the debug overlay's GK ANIM readout. node live_evidence.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"evidence"; fs.mkdirSync(OUT,{recursive:true});
const CASES=[
 {id:"S_NEAR", expect:"TIGHT_S_NEAR_TOP", origin:[103.5,46], aim:[105,37.3], tech:"CHIP", c:0.55, label:"SOUTH tight angle, chip to the near top corner"},
 {id:"S_FAR",  expect:"TIGHT_S_FAR_TOP",  origin:[102.5,45], aim:[105,30.7], tech:"CHIP", c:0.6,  label:"SOUTH tight angle, chip to the far top corner"},
 {id:"N_NEAR", expect:"TIGHT_N_NEAR_TOP", origin:[103.5,22], aim:[105,30.7], tech:"CHIP", c:0.55, label:"NORTH tight angle, chip to the near top corner"},
 {id:"N_FAR",  expect:"TIGHT_N_FAR_TOP",  origin:[101,24],   aim:[105,37.3], tech:"CHIP", c:0.6,  label:"NORTH tight angle, chip to the far top corner"},
 {id:"OVER",   expect:"OVERHEAD_REACH_CW11", origin:[86,34], aim:[105,34],   tech:"CHIP", c:0.74, label:"central shooter, chip just under the bar over the keeper"},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-ev-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const meta=await p.evaluate(()=>({ url:location.href, manifest:GK_ANIM.manifest, savePoseManifest:GK_ANIM.savePoseManifest, contextual:(S.gkAnim.contextual||[]).map(c=>c.id), override:GK_ANIM.reviewOverride }));
console.log("page:",JSON.stringify(meta));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400)); await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const facing0=S.pt.gk.facing;
    ptGkFire({name:"LIVE "+c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c}); gkAnimResetView(); S.pt.paused=false;
    let ticks=0, committed=null, ctx=null, cls=null, contact=null;
    while(ticks<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); ticks++; const g=S.pt.gk;
      if(g.committed&&!committed) committed=g.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx){ ctx=S.gkAnim.commit.ctx; cls=S.gkAnim.commit.cls; }
      if(g.contact){ contact={outcome:g.contact.outcome, volume:g.contact.volume, tick:ticks}; break; }
      if(S.pt.paused) break;
      if(committed && S.pt.now >= committed.t0 + committed.execTime) break; }
    S.pt.paused=true;   // hold the simulation exactly here while the frame and the overlay are captured (the page's own loop must not advance it)
    const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), cur=S.gkAnim.cur;
    return {ticks, root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)], facingBeforeDeg:+(facing0*180/Math.PI).toFixed(1), facingBin:headingToDir(facing0*180/Math.PI),
      committed: committed?{target:committed.target.map(v=>+v.toFixed(2)), tier:committed.tier, action:committed.action}:null, cls: cls?{family:cls.family,hClass:cls.hClass,L:cls.L,dz:cls.dz}:null, ctx: ctx?{pick:ctx.pick&&{id:ctx.pick.id,inventory:ctx.pick.inventory_id,score:ctx.pick.score,why:ctx.pick.why}, situation:ctx.situation, scored:ctx.scored}:null, contact, liveState:cur&&cur.state, liveArt:cur&&cur.artLabel, drawnSavePose: cur&&cur.savePose?{key:cur.savePose.key, contextual:!!cur.savePose.contextual, candidate:cur.savePose.candidate}:null }; }, c);
  await new Promise(r=>setTimeout(r,150)); const clip={x:Math.round(g.sp[0])-120,y:Math.round(g.sp[1])-125,width:240,height:165}; await p.screenshot({path:path.join(OUT,c.id+"_live.png"),clip});
  await p.evaluate(()=>{ S.dbg.anim=true; }); await new Promise(r=>setTimeout(r,150)); await p.screenshot({path:path.join(OUT,c.id+"_live_overlay.png"),clip:{x:0,y:0,width:1400,height:900}}); await p.evaluate(()=>{ S.dbg.anim=false; });
  rec.push({...c,...g,file:c.id+"_live.png"}); const pk=g.ctx&&g.ctx.pick;
  console.log(c.id,"| expect",c.expect,"| picked",pk?pk.id+" ("+pk.inventory+") "+pk.score:"none","| drawn",g.drawnSavePose,"| cls",g.cls,"| contact",g.contact&&g.contact.outcome,"| art:",g.liveArt&&g.liveArt.slice(0,80));
}
fs.writeFileSync(path.join(OUT,"cases.json"),JSON.stringify(rec,null,1)); await b.close();})();
