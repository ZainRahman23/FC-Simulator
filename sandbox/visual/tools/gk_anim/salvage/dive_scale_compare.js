// SCALE COMPARISON at ONE keeper root: the SET keeper, the dive pose drawn at the source art's own pixel density (oversized), and the
// dive pose drawn at the measured body scale. Same save, same root, same contact tick; only the drawn body scale differs.
//   node dive_scale_compare.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"scale_cmp"; fs.mkdirSync(OUT,{recursive:true});
const CASE={lat:-2.0, z:1.45, v:25};
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-dsc-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
  const origin=[101.7-20,34];
  ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  ptGkFire({name:"DIVE NORTH", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
  let t=0, committed=null; while(t<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
    if(gk.contact||S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
  S.pt.paused=true;
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), an=S.gkAnim.savePoses.CONTEXTUAL.ANY.DIVE_NORTH_MEDHIGH.anchors;
  return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], dir:headingToDir(gk.facing*180/Math.PI),
          anchors:{root:an.root, pixel_scale:an.pixel_scale, base_off:an.root_offset_base_px}}; }, CASE);
console.log("case", JSON.stringify(g));
const CLIP={x:Math.round(g.sp[0])-190, y:Math.round(g.sp[1])-200, width:380, height:280};
// 1. the SET keeper standing at the same root
await p.evaluate((dir)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir, showLabel:false}; }, g.dir);
await new Promise(r=>setTimeout(r,200)); await p.screenshot({path:path.join(OUT,"A_SET.png"), clip:CLIP});
// 2. the dive drawn at the source art's own density (pixel_scale 1) with the root it needed at that density
const before=await p.evaluate(()=>{ const an=S.gkAnim.savePoses.CONTEXTUAL.ANY.DIVE_NORTH_MEDHIGH.anchors;
  const keep={root:an.root.slice(), ps:an.pixel_scale};
  const off=an.root_offset_base_px, lead=an.lead_glove;
  an.pixel_scale=1; an.root=[+(lead[0]+off[0]).toFixed(1), +(lead[1]+off[1]).toFixed(1)];
  const gk=S.pt.gk, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
  GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:"DIVE_NORTH_MEDHIGH", ik:true, simHand:hn, showLabel:false};
  return keep; });
await new Promise(r=>setTimeout(r,200)); await p.screenshot({path:path.join(OUT,"B_OVERSIZED.png"), clip:CLIP});
// 3. the same pose at the measured body scale
await p.evaluate((keep)=>{ const an=S.gkAnim.savePoses.CONTEXTUAL.ANY.DIVE_NORTH_MEDHIGH.anchors; an.pixel_scale=keep.ps; an.root=keep.root; }, before);
await new Promise(r=>setTimeout(r,200)); await p.screenshot({path:path.join(OUT,"C_CORRECTED.png"), clip:CLIP});
// 4. the live default draw (no override) for the same tick — must match C
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,200));
await p.screenshot({path:path.join(OUT,"D_LIVE.png"), clip:CLIP});
fs.writeFileSync(path.join(OUT,"case.json"), JSON.stringify({...g, clip:CLIP},null,1));
await b.close();})();
