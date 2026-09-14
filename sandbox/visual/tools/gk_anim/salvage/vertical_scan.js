// VERTICAL / OVERHEAD SAVE SCAN on the plain page (optionally with a review save-pose manifest): a list of synthetic balls over the keeper;
// the simulation runs untouched to its own contact tick (or execEnd + 0.25 s); records classification, committed action, the contextual pick
// and every scored pose, the contact, the hand/ball/root screen positions at contact, and a keeper-centred screenshot at the contact tick.
//   node vertical_scan.js <outdir> '<cases json: [{id,lat,z,v,[origin]}]>' [manifest page-relative url]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const CASES=JSON.parse(process.argv[3]); const MAN=process.argv[4]||null; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:path.join(process.env.TMPDIR||"/tmp","chrome-vscan-"+Date.now()),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now()+(MAN?"&savePoses="+encodeURIComponent(MAN):""),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ GK_ANIM.sequences=false; if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g0=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
    const origin=c.origin||[81.7,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const q0=sproj3(S.pt.gk.x,0,S.pt.gk.y); const setSp=[q0.x,q0.y]; window.__setSp=setSp; return {setSp}; }, c);
  await new Promise(r=>setTimeout(r,80)); const sclip={x:Math.round(g0.setSp[0])-160, y:Math.round(g0.setSp[1])-190, width:320, height:250};
  await p.screenshot({path:path.join(OUT,c.id+"_SET.png"), clip:sclip});
  const g=await p.evaluate((c)=>{ const origin=c.origin||[81.7,34]; const setSp=window.__setSp;
    ptGkFire({name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView();
    let t=0, committed=null, cls=null, ctx=null, contact=null, contactTick=null, maxHand=null;
    while(t<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk;
      if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx) ctx=S.gkAnim.commit.ctx;
      if(gk.handNow){ if(!maxHand||gk.handNow[2]>maxHand.z) maxHand={z:gk.handNow[2], t}; }
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,point:gk.contact.point,tickT:gk.contact.tickT}; contactTick=t; break; }
      if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, pl=cur&&cur.place;
    const s=S.playerVScale*depthScale(q.d)*RIG.zoom*RES;
    const smp=S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY&&cur&&cur.savePose?S.gkAnim.savePoses.CONTEXTUAL.ANY[cur.savePose.key]:null; const an=smp?smp.anchors:null;
    const poseInfo=an?{key:cur.savePose.key, root:an.root, lead:an.lead_glove, pixel_scale:an.pixel_scale||1, canvas:an.canvas, head:an.head, feet:an.feet||null, pelvis:an.pelvis||null}:null;
    return {setSp, sp:[q.x,q.y], s, poseInfo, root:[gk.x,gk.y], facingDeg:gk.facing*180/Math.PI, ballSp:[bq.x,bq.y], ball:[bl.x,bl.y,bl.z], handSp:hn?[hn.x,hn.y]:null, hand:gk.handNow, maxHandZ:maxHand,
      cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,zH:cls.zH,dz:cls.dz,L:cls.L,lat:cls.lat,norm:cls.norm,maxLat:cls.maxLat,goalSide:cls.goalSide,bestEffort:cls.bestEffort,side:cls.side}:null,
      committed: committed?{tier:committed.tier,action:committed.action,t0:committed.t0,execTime:committed.execTime,target:committed.target,feet:committed.feet,envNorm:committed.envNorm}:null,
      ctx: ctx&&ctx.pick?{id:ctx.pick.id, score:ctx.pick.score, why:ctx.pick.why}:null, scored: ctx?ctx.scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score):null, situation: ctx?ctx.situation:null,
      liveArt: cur&&cur.artLabel, animState: cur&&cur.state, place: pl?{dx:pl.dx,dy:pl.dy,raw:pl.rawErrPx,res:pl.finalErrPx,capped:pl.capped}:null, contact, contactTick, ticks:t}; }, c);
  await new Promise(r=>setTimeout(r,120));
  const clip={x:Math.round(g.sp[0])-160, y:Math.round(g.sp[1])-190, width:320, height:250};
  await p.screenshot({path:path.join(OUT,c.id+".png"), clip}); await p.screenshot({path:path.join(OUT,c.id+"_full.png")});
  rec.push({...c, ...g, clip});
  const cl=g.cls;
  console.log(`${c.id.padEnd(14)} lat ${String(c.lat).padEnd(5)} z ${String(c.z).padEnd(5)} | ${cl?(cl.family+" "+cl.hClass).padEnd(20)+" L "+String(cl.L).padEnd(6)+" dz "+String(cl.dz).padEnd(6)+" norm "+String(cl.norm).padEnd(6)+(cl.bestEffort?" BEST":"    "):"-"} | ${g.committed?(g.committed.tier+"/"+g.committed.action).padEnd(30):"-"} | pick ${g.ctx?(g.ctx.id+" "+g.ctx.score):"NONE"} | ${g.contact?("contact t"+g.contactTick+" "+g.contact.volume+" "+g.contact.outcome):"no contact"} | hand rel root ${g.handSp?[(g.handSp[0]-g.sp[0]).toFixed(1),(g.handSp[1]-g.sp[1]).toFixed(1)]:"-"} | ${g.liveArt||""}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();
