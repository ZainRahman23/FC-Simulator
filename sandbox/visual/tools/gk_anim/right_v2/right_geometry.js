// GEOMETRY OF ONE REPRESENTATIVE FAR RIGHT SAVE on the plain page: the simulation runs untouched (live build, whatever it draws); per tick
// the keeper root (world + screen), facing, hand, ball, u, phase, committed action; at commit the screen projections of the world axes
// and of the keeper's facing / physical-RIGHT vectors at the keeper; the contact record. Screenshots at SET, commit, mid-action, contact.
//   node right_geometry.js <outdir> '<shot json>' [--off]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const SHOT=JSON.parse(process.argv[3]); const OFF=process.argv.includes("--off"); fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-rg-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate((off)=>{ GK_ANIM.sequences=!off; }, OFF);
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y);
  const setInfo={root:[gk.x,gk.y], facing:gk.facing, sp:[q.x,q.y], s:S.playerVScale*depthScale(q.d)*RIG.zoom*RES, dir:headingToDir(gk.facing*180/Math.PI), goal:{lineX:GK_MOUTH.lineX, centerY:GK_MOUTH.centerY}};
  ptGkFire({name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c, synth:c.synth}); gkAnimResetView();
  return setInfo; }, SHOT);
const CLIP={x:Math.round(start.sp[0])-230, y:Math.round(start.sp[1])-250, width:460, height:330};
await p.screenshot({path:path.join(OUT,"shot_SET.png"), clip:CLIP}); await p.screenshot({path:path.join(OUT,"full_SET.png")});
const trace=[]; let committedTick=null, contactTick=null, commitInfo=null, backToSet=null;
for(let f=0; f<200; f++){
  const st=await p.evaluate(()=>{ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
    const gk=S.pt.gk, c=gk.committed, sp=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, cur=S.gkAnim.cur;
    const u=c?Math.max(0,Math.min(1,(S.pt.now-c.t0)/Math.max(1e-6,c.execTime))):null;
    const o={now:+S.pt.now.toFixed(4), root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], vel:[+(gk.vx||0).toFixed(3),+(gk.vy||0).toFixed(3)], facing:+gk.facing.toFixed(4), sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], s:+(S.playerVScale*depthScale(sp.d)*RIG.zoom*RES).toFixed(4),
      hand:gk.handNow?gk.handNow.map(v=>+v.toFixed(4)):null, handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, ball:[+bl.x.toFixed(4),+bl.y.toFixed(4),+bl.z.toFixed(4)], ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)],
      u:u!=null?+u.toFixed(4):null, state:gk.state, phase:gk.phase, diveU:gk.diveU!=null?+gk.diveU.toFixed(4):null, committed:!!c, contact:gk.contact?{tickT:gk.contact.tickT,outcome:gk.contact.outcome,volume:gk.contact.volume,point:gk.contact.point}:null,
      anim:cur?{state:cur.state,phase:cur.phase,art:cur.artLabel,u:cur.u,place:cur.place?{dx:cur.place.dx,dy:cur.place.dy}:null}:null};
    if(c && !window.__commitInfo){ // screen projections of unit vectors at the keeper (world axes + facing + physical right), once at commit
      const q0=sproj3(gk.x,0,gk.y); const pr=(dx,dy,dz)=>{ const q=sproj3(gk.x+dx,dz,gk.y+dy); return [+(q.x-q0.x).toFixed(3),+(q.y-q0.y).toFixed(3)]; };
      const fx=Math.cos(gk.facing), fy=Math.sin(gk.facing); const rx=-Math.sin(gk.facing), ry=Math.cos(gk.facing);   // right = facing turned +90° in the (x, y-south) world
      const tq=sproj3(c.target[0],c.target[2],c.target[1]);
      window.__commitInfo={t0:c.t0, execTime:c.execTime, tier:c.tier, action:c.action, bestEffort:c.bestEffort, target:c.target, feet:c.feet, handOrigin:c.handOrigin, envNorm:c.envNorm, diveSpanMax:c.diveSpanMax, reachMargin:c.reachMargin, actionDetail:c.actionDetail,
        facing:gk.facing, facingDeg:+(gk.facing*180/Math.PI).toFixed(1), dir:headingToDir(gk.facing*180/Math.PI), facingVec:[+fx.toFixed(3),+fy.toFixed(3)], rightVec:[+rx.toFixed(3),+ry.toFixed(3)],
        proj:{east:pr(1,0,0), north:pr(0,-1,0), up:pr(0,0,1), facing:pr(fx,fy,0), right:pr(rx,ry,0), targetRel:[+(tq.x-q0.x).toFixed(2),+(tq.y-q0.y).toFixed(2)]},
        cls:S.gkAnim.commit&&S.gkAnim.commit.cls?{family:S.gkAnim.commit.cls.family,side:S.gkAnim.commit.cls.side,goalSide:S.gkAnim.commit.cls.goalSide,hClass:S.gkAnim.commit.cls.hClass,norm:S.gkAnim.commit.cls.norm,L:S.gkAnim.commit.cls.L,lat:S.gkAnim.commit.cls.lat,z:S.gkAnim.commit.cls.z,dz:S.gkAnim.commit.cls.dz,saveAngle:S.gkAnim.commit.cls.saveAngle,expr:S.gkAnim.commit.cls.expr}:null,
        pick:S.gkAnim.commit&&S.gkAnim.commit.ctx&&S.gkAnim.commit.ctx.pick?{id:S.gkAnim.commit.ctx.pick.id,score:S.gkAnim.commit.ctx.pick.score}:null, seqDir:S.gkAnim.commit?S.gkAnim.commit.seqDir:null}; }
    return o; });
  trace.push({f,...st});
  if(st.committed&&committedTick==null){ committedTick=f; commitInfo=await p.evaluate(()=>window.__commitInfo); await new Promise(r=>setTimeout(r,30)); await p.screenshot({path:path.join(OUT,"shot_COMMIT.png"),clip:CLIP}); await p.screenshot({path:path.join(OUT,"full_COMMIT.png")}); }
  if(committedTick!=null && st.u!=null && st.u>=0.5 && !fs.existsSync(path.join(OUT,"shot_MID.png"))){ await new Promise(r=>setTimeout(r,30)); await p.screenshot({path:path.join(OUT,"shot_MID.png"),clip:CLIP}); }
  if(st.contact&&contactTick==null){ contactTick=f; await new Promise(r=>setTimeout(r,30)); await p.screenshot({path:path.join(OUT,"shot_CONTACT.png"),clip:CLIP}); await p.screenshot({path:path.join(OUT,"full_CONTACT.png")}); }
  if(contactTick!=null && backToSet==null && st.anim && (st.anim.state==="SET"||st.anim.state==="IDLE") && f>contactTick+10) backToSet=f;
  if(backToSet!=null && f>backToSet+6) break;
  if(committedTick!=null && contactTick==null && f>committedTick+90) break;
}
fs.writeFileSync(path.join(OUT,"geometry.json"), JSON.stringify({shot:SHOT, off:OFF, set:start, clip:CLIP, committedTick, contactTick, backToSet, commit:commitInfo, trace},null,1));
console.log("SET facing", start.dir, (start.facing*180/Math.PI).toFixed(1), "| commit tick", committedTick, "contact tick", contactTick, "backToSet", backToSet); console.log("commit:", JSON.stringify(commitInfo).slice(0,900));
await b.close();})();
