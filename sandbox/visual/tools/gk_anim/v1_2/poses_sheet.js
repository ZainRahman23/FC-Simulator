// V1.2 8-POSE REVIEW CAPTURE: drives the review page through its DOM controls (SAVE SIDE, CONTACT HEIGHT, LATERAL DEMAND,
// art family, RAW / bounded IK) and screenshots each candidate save pose ON THE REAL RENDERER at the live playtest camera
// (rail 88, zoom 1.25) and at a 1:1 detail camera (rail 102.2, zoom 2.99): keeper at the simulation root, ball at the contact
// target, magenta save vector root→target, white target ring. node poses_sheet.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"poses_sheet"; fs.mkdirSync(OUT,{recursive:true});
const POSES=[["LOW_COLLAPSE","GOAL_LEFT",1.2,0.30,"LOW"],["AIRBORNE_DIVE","GOAL_LEFT",1.5,1.0,"MID"],["AIRBORNE_DIVE","GOAL_LEFT",1.5,1.7,"HIGH"],["AIRBORNE_DIVE","GOAL_LEFT",1.8,2.2,"TOP"],
             ["LOW_COLLAPSE","GOAL_RIGHT",1.2,0.30,"LOW"],["AIRBORNE_DIVE","GOAL_RIGHT",1.5,1.0,"MID"],["AIRBORNE_DIVE","GOAL_RIGHT",1.5,1.7,"HIGH"],["AIRBORNE_DIVE","GOAL_RIGHT",1.8,2.2,"TOP"]];
const CAMS=[["live",88,1.25,170,150,[-85,-115]],["detail",102.2,2.990127635821332,360,380,[-180,-300]]];   // name, rail, zoom, crop w, h, offset of the crop from the root
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-poses",args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1500,height:900,deviceScaleFactor:1}); const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{ if(m.type()==="warning"||m.type()==="error") errs.push("console: "+m.text()); });
await p.goto("http://127.0.0.1:8126/sandbox/visual/gk_anim_review.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>!!(window.GK_REVIEW&&S.pt&&S.pt.on&&S.gkAnim&&S.gkAnim.loaded));if(ok)break;await new Promise(r=>setTimeout(r,100));}
await new Promise(r=>setTimeout(r,800));
const loaded=await p.evaluate(()=>{ const sp=S.gkAnim.savePoses; const out={}; for(const f in sp) for(const s in sp[f]) out[f+"/"+s]=Object.keys(sp[f][s]); return out; });
console.log("save poses loaded:",JSON.stringify(loaded));
const rec=[];
for(const [fam,side,lat,z,key] of POSES){
  // 1. review controls through the DOM: SAVE SIDE button, CONTACT HEIGHT + LATERAL DEMAND sliders, FIRE, then pause + step to the commit
  const st=await p.evaluate((side,lat,z)=>{ document.querySelector(`[data-gside="${side}"]`).click(); S.pt.paused=true;
    const set=(id,v)=>{ const el=document.getElementById(id); el.value=v; el.dispatchEvent(new Event("input",{bubbles:true})); }; set("rv-lat",lat); set("rv-z",z);
    document.getElementById("rv-fire").click(); S.pt.paused=true; let n=0; while(!S.pt.gk.committed&&n<240){ ptStep(); n++; }
    const RV=window.GK_REVIEW; const g=S.pt.gk; const cm=g.committed; return {gside:RV.gside, lat:RV.lat, z:RV.z, ticks:n, committed:!!cm, action:cm&&cm.action, tier:cm&&cm.tier, envNorm:cm&&cm.envNorm, target:cm&&cm.target.map(v=>+v.toFixed(2)), keeper:[+g.x.toFixed(2),+g.y.toFixed(2)], facingDeg:+(g.facing*180/Math.PI).toFixed(1), normRead:document.getElementById("rv-norm-v").textContent}; },side,lat,z);
  // 2. art playback of the family (page's own button) → paused, override built by the page from the sliders
  await p.evaluate((fam)=>{ document.querySelector(`[data-fam="${fam}"]`).click(); },fam);
  const row={fam,side,key,lat,z,st,shots:{}};
  for(const ik of ["raw","ik"]){
    const info=await p.evaluate((ik)=>{ document.querySelector(`[data-ik="${ik}"]`).click(); const o=GK_ANIM.reviewOverride; if(!o||o.kind!=="savepose") return {override:o&&o.kind, err:"no savepose override"};
      // ball at the contact target for the sheet (read-only for the simulation: paused, no stepping after this)
      S.pt.b.x=o.target[0]; S.pt.b.y=o.target[1]; S.pt.b.z=o.target[2]; S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0;
      // replicate the runtime's placement numbers for the record
      const A=S.gkAnim, g=S.pt.gk; const sides=A.savePoses[o.family][o.side]; const smp=sides[o.key]||sides.MID||Object.values(sides)[0]; const an=smp.anchors||{};
      const sp=sproj3(g.x,0,g.y); const s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES; const ax=an.root[0], ay=an.root[1]; const gl=an.gloves&&an.gloves.length?an.gloves:[an.lead_glove];
      const dx0=Math.round(sp.x-ax*s), dy0=Math.round(sp.y-ay*s); const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*s),y:dy0+Math.round(py*s)}),o.simHand,false); const pl=gkAnimPlace(raw,o.simHand,ik==="ik"?1:0,s,null);
      return {override:o.kind, family:o.family, side:o.side, key:o.key, exact:!!sides[o.key], ik:o.ik, rawErrPx:pl.rawErrPx, corrPx:pl.corrPx, finalErrPx:pl.finalErrPx, capped:pl.capped, spriteScale:+s.toFixed(3), target:o.target.map(v=>+v.toFixed(2))}; },ik);
    row.shots[ik]={info,files:{}};
    for(const [cn,rail,zoom,cw,ch,off] of CAMS){
      const sp=await p.evaluate((rail,zoom,cn)=>{ RIG.mode="manual"; RIG.manualX=rail; RIG.targetX=rail; RIG.x=rail; RIG.zoom=zoom; RIG.zoomTarget=zoom; S.dbg.anim=(cn==="detail"); const g=S.pt.gk; const q=sproj3(g.x,0,g.y); return [q.x,q.y]; },rail,zoom,cn);
      await new Promise(r=>setTimeout(r,320));
      const sp2=await p.evaluate(()=>{ const g=S.pt.gk; const q=sproj3(g.x,0,g.y); return [Math.round(q.x),Math.round(q.y),RIG.x,RIG.zoom]; });
      const f=path.join(OUT,`${fam}_${side}_${key}_${ik}_${cn}.png`); const clip={x:Math.max(0,sp2[0]+off[0]),y:Math.max(0,sp2[1]+off[1]),width:cw,height:ch};
      await p.screenshot({path:f,clip}); row.shots[ik].files[cn]={file:path.basename(f),root:[sp2[0]-clip.x,sp2[1]-clip.y],rail:sp2[2],zoom:sp2[3]};
    }
    console.log(fam,side,key,ik,"→",JSON.stringify(info));
  }
  rec.push(row); console.log("  sim:",JSON.stringify(st));
}
fs.writeFileSync(path.join(OUT,"poses_sheet.json"),JSON.stringify({poses:rec,loaded,errors:errs},null,1)); console.log("errors",JSON.stringify(errs.slice(0,5))); await b.close();})();
