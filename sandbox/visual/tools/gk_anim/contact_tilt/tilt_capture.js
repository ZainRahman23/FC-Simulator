// CONTACT-ORIENTATION TEST capture: the representative save on the plain page (untouched simulation, live art) or with a review-only
// save-pose manifest (?savePoses=<page-relative url>) that swaps ONLY the DIVE_NORTH_MEDHIGH sprite for a tilt variant. Sequences are
// off in every run so the contact tick is drawn by the untouched save-pose path (same root, body scale, hand-led placement).
// Records per tick root/hand/ball (simulation identity across runs), the runtime's placement readout at the contact tick, the loaded
// pose's anchors/rotation, and screenshots (full viewport + keeper clip) at the contact tick.
//   node tilt_capture.js <outdir> '<shot json>' [manifest page-relative url]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const SHOT=JSON.parse(process.argv[3]); const MAN=process.argv[4]||null; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:path.join(process.env.TMPDIR||"/tmp","chrome-tilt-"+Date.now()),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
const url="http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now()+(MAN?"&savePoses="+encodeURIComponent(MAN):"");
await p.goto(url,{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const loaded=await p.evaluate(()=>{ const sp=S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY?S.gkAnim.savePoses.CONTEXTUAL.ANY.DIVE_NORTH_MEDHIGH:null; const ctx=(S.gkAnim.contextual||[]).length;
  return {manifest:GK_ANIM.savePoseManifest||null, contextualCount:ctx, pose:sp?{canvas:[sp.img.width,sp.img.height], rotation:sp.anchors&&sp.anchors.rotation_cw_deg, tilt:sp.anchors&&sp.anchors.tilt_from_live_deg, root:sp.anchors&&sp.anchors.root, lead:sp.anchors&&sp.anchors.lead_glove, pixel_scale:sp.anchors&&sp.anchors.pixel_scale, approved:sp.approved}:null}; });
console.log("loaded:", JSON.stringify(loaded));
await p.evaluate(()=>{ GK_ANIM.sequences=false; if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const start=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
  ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y);
  // goal line on screen: the two posts projected at ground level (GK_MOUTH.lineX, centerY ± half width)
  const hw=(GK_MOUTH.halfW!=null?GK_MOUTH.halfW:(GK_MOUTH.width?GK_MOUTH.width/2:3.66));
  const pa=sproj3(GK_MOUTH.lineX,0,GK_MOUTH.centerY-hw), pb=sproj3(GK_MOUTH.lineX,0,GK_MOUTH.centerY+hw), pt=sproj3(GK_MOUTH.lineX,2.44,GK_MOUTH.centerY-hw), pu=sproj3(GK_MOUTH.lineX,2.44,GK_MOUTH.centerY+hw);
  const setInfo={root:[gk.x,gk.y], facing:gk.facing, sp:[q.x,q.y], s:S.playerVScale*depthScale(q.d)*RIG.zoom*RES, dir:headingToDir(gk.facing*180/Math.PI), goal:{lineX:GK_MOUTH.lineX, centerY:GK_MOUTH.centerY, halfW:hw, postA:[pa.x,pa.y], postB:[pb.x,pb.y], barA:[pt.x,pt.y], barB:[pu.x,pu.y]}};
  ptGkFire({name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c, synth:c.synth}); gkAnimResetView();
  return setInfo; }, SHOT);
const CLIP={x:Math.round(start.sp[0])-230, y:Math.round(start.sp[1])-250, width:460, height:330};
const trace=[]; let committedTick=null, contactTick=null, commitInfo=null, contactInfo=null;
for(let f=0; f<140; f++){
  const st=await p.evaluate(()=>{ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
    const gk=S.pt.gk, c=gk.committed, sp=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, cur=S.gkAnim.cur;
    const u=c?Math.max(0,Math.min(1,(S.pt.now-c.t0)/Math.max(1e-6,c.execTime))):null;
    return {now:+S.pt.now.toFixed(4), root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], facing:+gk.facing.toFixed(4), sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], s:+(S.playerVScale*depthScale(sp.d)*RIG.zoom*RES).toFixed(4),
      hand:gk.handNow?gk.handNow.map(v=>+v.toFixed(4)):null, handSp:hn?[+hn.x.toFixed(2),+hn.y.toFixed(2)]:null, ball:[+bl.x.toFixed(4),+bl.y.toFixed(4),+bl.z.toFixed(4)], ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)],
      u:u!=null?+u.toFixed(4):null, state:gk.state, committed:!!c, contact:gk.contact?{tickT:gk.contact.tickT,outcome:gk.contact.outcome,volume:gk.contact.volume,point:gk.contact.point}:null,
      anim:cur?{state:cur.state,phase:cur.phase,art:cur.artLabel,u:cur.u,place:cur.place?{dx:cur.place.dx,dy:cur.place.dy,raw:cur.place.rawErrPx,corr:cur.place.corrPx,res:cur.place.finalErrPx,capped:cur.place.capped}:null}:null}; });
  trace.push({f,...st});
  if(st.committed&&committedTick==null){ committedTick=f; commitInfo=await p.evaluate(()=>{ const c=S.pt.gk.committed, A=S.gkAnim; return {t0:c.t0, execTime:c.execTime, tier:c.tier, action:c.action, target:c.target, feet:c.feet, envNorm:c.envNorm,
      pick:A.commit&&A.commit.ctx&&A.commit.ctx.pick?{id:A.commit.ctx.pick.id,score:A.commit.ctx.pick.score}:null, cls:A.commit&&A.commit.cls?{family:A.commit.cls.family,goalSide:A.commit.cls.goalSide,hClass:A.commit.cls.hClass,norm:A.commit.cls.norm}:null}; }); }
  if(st.contact&&contactTick==null){ contactTick=f; await new Promise(r=>setTimeout(r,60));
    await p.screenshot({path:path.join(OUT,"full_CONTACT.png")}); await p.screenshot({path:path.join(OUT,"clip_CONTACT.png"),clip:CLIP});
    contactInfo=await p.evaluate(()=>{ const A=S.gkAnim, gk=S.pt.gk, cur=A.cur, sp=sproj3(gk.x,0,gk.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, cp=gk.contact&&gk.contact.point?sproj3(gk.contact.point[0],gk.contact.point[2],gk.contact.point[1]):null;
      const smp=A.savePoses.CONTEXTUAL&&A.savePoses.CONTEXTUAL.ANY?A.savePoses.CONTEXTUAL.ANY.DIVE_NORTH_MEDHIGH:null; const an=smp?smp.anchors:null; const s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES; const ps=s*(an&&an.pixel_scale||1);
      const pl=cur&&cur.place?cur.place:(A.commit&&A.commit.place?A.commit.place:null);
      const ax=an?an.root[0]:0, ay=an?an.root[1]:0; const dx0=Math.round(sp.x-ax*ps), dy0=Math.round(sp.y-ay*ps);
      const toScreen=(px,py)=>[dx0+(pl?pl.dx:0)+px*ps, dy0+(pl?pl.dy:0)+py*ps];
      const lm=an&&an.landmarks_canvas_px?an.landmarks_canvas_px:null;
      return {sp:[sp.x,sp.y], s, ps, handSp:hn?[hn.x,hn.y]:null, contactSp:cp?[cp.x,cp.y]:null, hand:gk.handNow, contactPoint:gk.contact&&gk.contact.point, ball:[S.pt.b.x,S.pt.b.y,S.pt.b.z], ballSp:(()=>{const q=sproj3(S.pt.b.x,S.pt.b.z,S.pt.b.y);return [q.x,q.y];})(),
        art:cur&&cur.artLabel, place:pl?{dx:pl.dx,dy:pl.dy,raw:pl.rawErrPx,corr:pl.corrPx,res:pl.finalErrPx,capped:pl.capped,w:pl.w}:null, lastContact:A.lastContact?{art:A.lastContact.art,errPx:A.lastContact.errPx,spritePx:A.lastContact.spritePx,wrongClip:A.lastContact.wrongClip,place:A.lastContact.place}:null,
        pose:an?{rotation:an.rotation_cw_deg, tilt:an.tilt_from_live_deg, root:an.root, lead:an.lead_glove, gloves:an.gloves, head:an.head, canvas:an.canvas, pixel_scale:an.pixel_scale}:null,
        blitOrigin:[dx0+(pl?pl.dx:0), dy0+(pl?pl.dy:0)],
        drawn:{lead:an?toScreen(an.lead_glove[0],an.lead_glove[1]):null, head:an?toScreen(an.head[0],an.head[1]):null, root:an?toScreen(an.root[0],an.root[1]):null,
               hip:lm&&lm.hip?toScreen(lm.hip[0],lm.hip[1]):null, headT:lm&&lm.head?toScreen(lm.head[0],lm.head[1]):null, feet:lm&&lm.feet?toScreen(lm.feet[0],lm.feet[1]):null, gloveFar:lm&&lm.glove_far?toScreen(lm.glove_far[0],lm.glove_far[1]):null, gloveNear:lm&&lm.glove_near?toScreen(lm.glove_near[0],lm.glove_near[1]):null}}; });
    break; }
  if(committedTick!=null && contactTick==null && f>committedTick+90) break;
}
fs.writeFileSync(path.join(OUT,"capture.json"), JSON.stringify({shot:SHOT, manifest:MAN, loaded, set:start, clip:CLIP, committedTick, contactTick, commit:commitInfo, contact:contactInfo, trace},null,1));
console.log("commit tick", committedTick, "contact tick", contactTick, "| pick", JSON.stringify(commitInfo&&commitInfo.pick), "| contact:", contactInfo&&contactInfo.art, "| place", JSON.stringify(contactInfo&&contactInfo.place), "| pose rot", contactInfo&&contactInfo.pose&&contactInfo.pose.rotation);
await b.close();})();
