// LIVE-CAMERA PROBE: W / SW / NW facings, ball parked on the bearing (on-axis and off-axis), default live camera (no manual rig).
// Steps the simulation itself (page loop paused) at 60 Hz and runs the keeper draw each step; logs anim state, clip frame, sim state,
// |v|, odometer, and the actual blit rectangle (monkey-patched gkAnimBlit) so the screen-space sprite position is measured, not inferred.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const URL=process.argv[2]; const OUTF=process.argv[3];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-probe-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const patched=await p.evaluate(()=>{ try{ const orig=gkAnimBlit; gkAnimBlit=function(img,mirror,ax,ay,s,sx,sy,g){ const r=orig(img,mirror,ax,ay,s,sx,sy,g); window.__blit={dx:r.dx,dy:r.dy,dw:r.dw,dh:r.dh,ax,ay,sx:+sx.toFixed(2),sy:+sy.toFixed(2),s:+s.toFixed(4),mirror:!!mirror,w:img.width,h:img.height}; return r; }; return true; }catch(e){ return String(e); } });
console.log("blit patch:",patched);
const scen=[]; for(const [name,deg] of [["west",180],["south-west",135],["north-west",225]]) for(const off of [0,4,-4,10]) for(const R of [30,20]) scen.push({name,deg,off,R});
const out=[];
for(const sc of scen){
  const rec=await p.evaluate((sc)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
    const a=(sc.deg+sc.off)*Math.PI/180; ptGkFire({name:"PROBE", origin:[101.7+Math.cos(a)*sc.R, 34+Math.sin(a)*sc.R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
    S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView();
    const rows=[]; let lastOdo=0;
    for(let f=0;f<480;f++){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); const g=S.pt.gk, cur=S.gkAnim.cur, A=S.gkAnim, bl=window.__blit||{};
      rows.push({f, t:+S.pt.now.toFixed(3), st:cur.state, clip:cur.clip?cur.clip.name+"/"+cur.clip.v.dir+(cur.clip.mirrored?"m":"")+"#"+cur.clip.pos:null, sim:g.state, v:+Math.hypot(g.vx,g.vy).toFixed(4), x:+g.x.toFixed(4), y:+g.y.toFixed(4), odo:+A.odo.toFixed(4), dir:cur.dir, dx:bl.dx, dy:bl.dy, ay:bl.ay, sy:bl.sy, s:bl.s, ballD:+Math.hypot(S.pt.b.x-g.x,S.pt.b.y-g.y).toFixed(2), facing:+(g.facing*180/Math.PI).toFixed(1)}); }
    return {sc, zoom:RIG.zoom, rig:RIG.x, rows}; }, sc);
  const rows=rec.rows.slice(120); // after 2 s settle
  const states={}; rows.forEach(r=>{states[r.st]=(states[r.st]||0)+1;});
  const clipChanges=rows.filter((r,i)=>i>0&&r.clip!==rows[i-1].clip).length; const dyChanges=rows.filter((r,i)=>i>0&&(r.dy!==rows[i-1].dy||r.dx!==rows[i-1].dx)).length;
  const odoRate=(rows[rows.length-1].odo-rows[0].odo)/((rows.length)/60);
  const vs=rows.map(r=>r.v); const vmax=Math.max(...vs), vmin=Math.min(...vs);
  const travel=Math.hypot(rows[rows.length-1].x-rows[0].x, rows[rows.length-1].y-rows[0].y);
  const line=`${sc.name.padEnd(10)} off ${String(sc.off).padStart(3)}° R ${sc.R} | facing dir ${rows[0].dir.padEnd(10)} ballD ${rows[0].ballD} | states ${JSON.stringify(states)} | sim ${[...new Set(rows.map(r=>r.sim))].join("/")} |v| ${vmin.toFixed(3)}..${vmax.toFixed(3)} | odo/s ${odoRate.toFixed(3)} m | net travel 6s ${travel.toFixed(4)} m | clip changes ${clipChanges} | blit dx/dy changes ${dyChanges} | s ${rows[0].s} zoom ${rec.zoom}`;
  console.log(line); out.push({sc, summary:line, rows:rec.rows});
}
fs.writeFileSync(OUTF, JSON.stringify(out)); await b.close();})();
