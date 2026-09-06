// SW-FACING FAR DIVE mapping test (presentation only): the raw sprite ORIGINAL and MIRRORED, each drawn into two real SOUTH-WEST-facing
// far airborne saves — one to the keeper's physical RIGHT, one to his physical LEFT (the sim's own keeper-frame side). Root anchor only:
// no rotation, no IK, no warp, no per-case calibration.   node sw_dive_test.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"sw_test"; fs.mkdirSync(OUT,{recursive:true});
const MAN="/review_artifacts/gk_dive_south_v2/sw_test/GK_SW_FAR_DIVE_TEST.json";
const CASES=[{id:"RIGHT", lat:-2.2, z:1.45, v:25}, {id:"LEFT", lat:2.2, z:1.45, v:25}];
const VARIANTS=["SW_ORIGINAL","SW_MIRRORED"];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-swt-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("loaded:", await p.evaluate(()=>Object.keys(S.gkAnim.savePoses.CONTEXTUAL.ANY).join(" ")));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const a=135*Math.PI/180, R=20, origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp0(q))*RIG.zoom*RES;
    function sp0(){ return 0; }
    const tp=committed?sproj3(committed.target[0],committed.target[2],committed.target[1]):null;
    const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], targetSp: tp?[+tp.x.toFixed(1),+tp.y.toFixed(1)]:null, handSp: hn?[+hn.x.toFixed(1),+hn.y.toFixed(1)]:null,
      root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], dir:headingToDir(gk.facing*180/Math.PI), facingDeg:+(gk.facing*180/Math.PI).toFixed(1),
      committed: committed?{target:committed.target.map(v=>+v.toFixed(2)),tier:committed.tier,action:committed.action}:null,
      cls: cls?{family:cls.family,hClass:cls.hClass,side:cls.side,goalSide:cls.goalSide,z:cls.z,L:cls.L,norm:cls.norm}:null, contact}; }, c);
  const CLIP={x:Math.round(g.sp[0])-190, y:Math.round(g.sp[1])-180, width:380, height:290};
  // the SW keeper standing at this root, for the perspective reference
  // the SET keeper in the facing the pose family is about (south-west at commit), not the contact-tick facing which has tracked the ball
  await p.evaluate(()=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir:"south-west", showLabel:false}; });
  await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,c.id+"_SET.png"), clip:CLIP});
  const per={};
  for(const key of VARIANTS){
    const info=await p.evaluate((a)=>{ const gk=S.pt.gk, smp=S.gkAnim.savePoses.CONTEXTUAL.ANY[a.key], an=smp.anchors;
      const sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES, ps=s*(an.pixel_scale||1);
      const mir=!!smp.mirror, ax=an.root[0], ay=an.root[1], img=smp.img;
      const dx0 = mir ? Math.round(sp.x-(img.width-ax)*ps) : Math.round(sp.x-ax*ps), dy0=Math.round(sp.y-ay*ps);
      const lg=an.lead_glove, gx = dx0 + Math.round((mir? img.width-lg[0] : lg[0])*ps), gy = dy0 + Math.round(lg[1]*ps);
      const tp=sproj3(a.target[0],a.target[2],a.target[1]);
      const rv=[tp.x-sp.x, tp.y-sp.y], gv=[gx-sp.x, gy-sp.y];
      const nr=Math.hypot(rv[0],rv[1])||1, ng=Math.hypot(gv[0],gv[1])||1;
      const cos=(rv[0]*gv[0]+rv[1]*gv[1])/(nr*ng), deg=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;
      GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:a.key, ik:false, target:a.target, showLabel:false};
      return {key:a.key, mirror:mir, gloveSp:[+gx.toFixed(1),+gy.toFixed(1)], targetSp:[+tp.x.toFixed(1),+tp.y.toFixed(1)],
              angleToTargetDeg:+deg.toFixed(1), gloveTargetPx:+Math.hypot(gx-tp.x, gy-tp.y).toFixed(1), scale:+ps.toFixed(4)}; },
      {key, target:g.committed.target});
    await new Promise(r=>setTimeout(r,180));
    await p.screenshot({path:path.join(OUT,c.id+"_"+key+".png"), clip:CLIP});
    per[key]=info;
    console.log(`${c.id} ${key.padEnd(12)} mirror ${String(info.mirror).padEnd(5)} glove→target ${String(info.gloveTargetPx).padStart(6)} px  angle between the drawn reach and the real save vector ${String(info.angleToTargetDeg).padStart(6)}deg`);
  }
  await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
  rec.push({...c, ...g, clip:CLIP, variants:per});
  console.log(`${c.id}: sim ${g.cls.family} ${g.cls.hClass} side ${g.cls.side} (${g.cls.goalSide}) norm ${g.cls.norm} L ${g.cls.L} | facing ${g.dir} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();
