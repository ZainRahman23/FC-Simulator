// ROTATION TEST in the live camera: one HIGH GOAL_RIGHT dive paused at its own contact tick; each rotation candidate drawn through the
// review override with the live path's hand-led placement (+ the committed contact target marker); same root, same tick, same camera.
//   node south_v6_rot_test.js <outdir> <manifest url path> <key,key,...>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]; const MAN=process.argv[3]; const KEYS=process.argv[4].split(","); fs.mkdirSync(OUT,{recursive:true});
const CASE={id:"HIGH", lat:2.0, z:1.45, v:25};
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-rot-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("loaded keys:", await p.evaluate((ks)=>ks.filter(k=>S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY&&S.gkAnim.savePoses.CONTEXTUAL.ANY[k]).join(" "), KEYS));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
  const origin=[101.7-20,34];
  ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  ptGkFire({name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
  let t=0, committed=null; while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed; if(gk.contact||S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
  S.pt.paused=true;
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(q.d)*RIG.zoom*RES, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y);
  const c0=committed, sv=sproj3(c0.feet[0],0,c0.feet[1]);
  return {tick:t, now:+S.pt.now.toFixed(4), sp:[+q.x.toFixed(2),+q.y.toFixed(2)], s:+s.toFixed(5), handSp:[+hn.x.toFixed(2),+hn.y.toFixed(2)], ballSp:[+bq.x.toFixed(2),+bq.y.toFixed(2)], target:c0.target, commitSp:[+sv.x.toFixed(2),+sv.y.toFixed(2)],
    contact: gk.contact?{outcome:gk.contact.outcome, volume:gk.contact.volume}:null, dir:headingToDir(gk.facing*180/Math.PI)}; }, CASE);
const WIDE={x:Math.round(g.sp[0])-330, y:Math.round(g.sp[1])-250, width:560, height:360};
const TIGHT={x:Math.round(g.sp[0])-110, y:Math.round(g.sp[1])-130, width:220, height:180};
const rec={case:CASE, ...g, wide:WIDE, tight:TIGHT, keys:{}};
async function shot(name, clip){ await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,name+".png"), clip}); }
await shot("A_today_wide", WIDE); await shot("A_today", TIGHT);
await p.evaluate((d)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir:d, showLabel:false}; }, g.dir); await shot("SET_same_root", TIGHT);
for(const k of KEYS){
  const pl=await p.evaluate((k,tg)=>{ const gk=S.pt.gk, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:k, ik:true, simHand:hn, target:tg, showLabel:false};
    const smp=S.gkAnim.savePoses.CONTEXTUAL.ANY[k], an=smp.anchors, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES, ps=s*(an.pixel_scale||1);
    const gl=an.gloves&&an.gloves.length?an.gloves:[an.lead_glove]; const dx0=Math.round(sp.x-an.root[0]*ps), dy0=Math.round(sp.y-an.root[1]*ps);
    const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*ps),y:dy0+Math.round(py*ps)}),hn,false); const r=gkAnimPlace(raw,hn,1,s,null);
    // drawn body axis on screen after placement: head → hip pivot direction (from the anchors) for the record
    const hd=an.head, pv=an.pivot_in_canvas; const ang=Math.atan2(pv[1]-hd[1], pv[0]-hd[0])*180/Math.PI;
    return {rawErrPx:r.rawErrPx, corrPx:r.corrPx, finalErrPx:r.finalErrPx, capped:r.capped, dx:r.dx, dy:r.dy, body_axis_deg:an.body_axis_deg, rotation:an.rotation_cw_deg, pixel_scale:an.pixel_scale, root:an.root, headToHipDeg:+ang.toFixed(1)}; }, k, g.target);
  await shot(k+"_wide", WIDE); await shot(k, TIGHT);
  await p.evaluate((k)=>{ GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:k, ik:false, showLabel:false}; }, k); await shot(k+"_raw", TIGHT);
  rec.keys[k]=pl; console.log(`${k}: rot ${pl.rotation}° body axis ${pl.body_axis_deg}° | placement raw ${pl.rawErrPx} corr ${pl.corrPx} res ${pl.finalErrPx}px${pl.capped?" CAPPED":""} | root ${JSON.stringify(pl.root)}`);
}
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
fs.writeFileSync(path.join(OUT,"rot_cases.json"), JSON.stringify(rec,null,1));
const sv=[g.handSp[0]-g.commitSp[0], g.handSp[1]-g.commitSp[1]]; console.log("contact tick", g.tick, "sim hand vs commit root", sv.map(v=>+v.toFixed(1)), "angle", (Math.atan2(sv[1],sv[0])*180/Math.PI).toFixed(1), "| ball", g.ballSp, "| contact", JSON.stringify(g.contact));
await b.close();})();
