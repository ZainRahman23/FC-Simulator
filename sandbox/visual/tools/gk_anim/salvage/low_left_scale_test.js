// SCALE COMPARISON (presentation only): the MIRRORED orientation in the FAR low-left save, drawn at several body scales. Same scenario,
// root, ball, contact tick and artwork in every column; the root anchor is re-derived per scale so the drawn glove stays at the SAME
// screen point, i.e. only the size of the human changes.   node low_left_scale_test.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"scale_test"; fs.mkdirSync(OUT,{recursive:true});
const MAN="/review_artifacts/gk_dive_south_v3/lowleft_test/GK_LOWLEFT_TEST.json";
const CASE={lat:1.9, z:0.45, v:24};                 // FAR low-left: AIRBORNE_DIVE LOW-MID, side LEFT, contact 0.522 m, lateral 1.896 m
const SCALES=[0.60,0.65,0.70,0.75,0.79];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-lls2-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
  const origin=[101.7-20,34];
  ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  ptGkFire({name:"FAR LOW LEFT", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
  let t=0, committed=null, cls=null, contact=null;
  while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
    if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
    if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
    if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
  S.pt.paused=true;
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), tp=committed?sproj3(committed.target[0],committed.target[2],committed.target[1]):null;
  // the reference glove position: the current 0.79 configuration with the normal bottom-centre root
  const an=S.gkAnim.savePoses.CONTEXTUAL.ANY.LL_MIRRORED.anchors, img=S.gkAnim.savePoses.CONTEXTUAL.ANY.LL_MIRRORED.img;
  const s=S.playerVScale*depthScale(q.d)*RIG.zoom*RES, ps=s*0.79, lg=an.lead_glove;
  const dx0=Math.round(q.x-(img.width-an.root[0])*ps), dy0=Math.round(q.y-an.root[1]*ps);
  const gx=dx0+Math.round((img.width-lg[0])*ps), gy=dy0+Math.round(lg[1]*ps);
  return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], targetSp: tp?[+tp.x.toFixed(1),+tp.y.toFixed(1)]:null, root:[+gk.x.toFixed(2),+gk.y.toFixed(2)],
    dir:headingToDir(gk.facing*180/Math.PI), gloveRefSp:[gx,gy], baseScale:+s.toFixed(4), rootAnchor:an.root, canvas:[img.width,img.height],
    committed: committed?{target:committed.target.map(v=>+v.toFixed(2)),tier:committed.tier,action:committed.action}:null,
    cls: cls?{family:cls.family,hClass:cls.hClass,side:cls.side,z:cls.z,L:cls.L,norm:cls.norm}:null, contact}; }, CASE);
console.log("SIM:", JSON.stringify(g));
const CLIP={x:Math.round(g.sp[0])-190, y:Math.round(g.sp[1])-160, width:380, height:280};
// SET keeper at the same root and zoom, as the size reference
await p.evaluate((dir)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir, showLabel:false}; }, "west");
await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,"SET.png"), clip:CLIP});
const per={};
for(const sc of SCALES){
  const info=await p.evaluate((a)=>{ const smp=S.gkAnim.savePoses.CONTEXTUAL.ANY.LL_MIRRORED, an=smp.anchors, img=smp.img, gk=S.pt.gk;
    const q=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(q.d)*RIG.zoom*RES, ps=s*a.sc, lg=an.lead_glove;
    // re-anchor: choose the root so the drawn lead glove lands on the SAME screen point as the reference configuration
    an.pixel_scale=a.sc;
    // mirrored blit: glove_x = sp.x + ps*(root_x - lead_x) and glove_y = sp.y + ps*(lead_y - root_y); invert for the root that pins the
    // drawn glove to the reference screen point, so every column places the contact identically and only the body size changes
    const rootX = lg[0] + (a.gx - q.x)/ps;
    const rootY = lg[1] - (a.gy - q.y)/ps;
    an.root=[+rootX.toFixed(1), +rootY.toFixed(1)];
    const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:"LL_MIRRORED", ik:false, target:a.target, showLabel:false};
    // verify the drawn glove really landed on the reference point
    const dx0=Math.round(q.x-(img.width-an.root[0])*ps), dy0=Math.round(q.y-an.root[1]*ps);
    const gx=dx0+Math.round((img.width-lg[0])*ps), gy=dy0+Math.round(lg[1]*ps);
    return {scale:a.sc, root:an.root, drawnGlove:[gx,gy], drawScale:+ps.toFixed(4),
            headPx:+(a.sc*24).toFixed(1)}; }, {sc, gx:g.gloveRefSp[0], gy:g.gloveRefSp[1], target:g.committed.target});
  await new Promise(r=>setTimeout(r,180));
  await p.screenshot({path:path.join(OUT,"S"+String(Math.round(sc*100))+".png"), clip:CLIP});
  per[sc]=info; console.log(`scale ${sc} -> root ${JSON.stringify(info.root)} drawn glove ${JSON.stringify(info.drawnGlove)} (reference ${JSON.stringify(g.gloveRefSp)}) draw scale ${info.drawScale}`);
}
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
fs.writeFileSync(path.join(OUT,"case.json"), JSON.stringify({...g, clip:CLIP, scales:per},null,1));
await b.close();})();
