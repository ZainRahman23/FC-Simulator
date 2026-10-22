import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {behindSVG,project,CAMERA,WIDTH,HEIGHT} from '../render.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH??'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ff=process.env.FFMPEG_PATH??'/Users/zainrahman/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/video-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'videos'),runs=JSON.parse(fs.readFileSync(path.join(root,'evidence/review.json'))).runs;
export const FPS=60,DURATION=4.8,LEAD=.25;
const validation=[],previews=process.argv.includes('--previews'),name=r=>`${r.id}-behind-1x`,png=svg=>sharp(Buffer.from(svg)).png({compressionLevel:1}).toBuffer();
fs.mkdirSync(out,{recursive:true});
function decode(file,expected){const progress=execFileSync(ff,['-hide_banner','-loglevel','error','-i',file,'-progress','pipe:1','-f','null','-'],{encoding:'utf8'}),frames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);if(frames!==Math.round(expected))throw Error('Frame count mismatch '+file+': '+frames+' vs '+Math.round(expected));return frames;}
async function encode(r){
 const points=[...r.frames.map(f=>f.p),r.initial.p,[85.6,1.82,33.7],[85.6,0,33.7],...[30.34,37.66].flatMap(z=>[[105,0,z],[105,2.44,z]])];
 if(points.some(p=>{const q=project(p);return q[3]<=0||q[0]<20||q[0]>WIDTH-20||q[1]<20||q[1]>HEIGHT-20;}))throw Error('Subject clipped at '+r.id);
 if(r.duration+LEAD>DURATION)throw Error('Physical sleep not shown '+r.id);
 fs.writeFileSync(path.join(out,name(r)+'-preview.png'),await png(behindSVG(r,.5)));
 if([50,80,99].includes(r.shotPower)&&[80,350,600].includes(r.holdMs))for(const t of [0,.25,.75,1.25])fs.writeFileSync(path.join(root,'evidence',`frame-${r.id}-${t.toFixed(2)}.png`),await png(behindSVG(r,t)));
 if(previews)return;
 const file=path.join(out,name(r)+'.mp4');
 if(!process.argv.includes('--comparisons')){
 const p=spawn(ff,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-r',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file]);let err='';p.stderr.on('data',b=>err+=b);const done=new Promise((ok,no)=>{p.on('error',no);p.on('close',code=>code===0?ok():no(Error(err)));});
 for(let i=0;i<DURATION*FPS;i++){const frame=await png(behindSVG(r,i/FPS-LEAD));if(!p.stdin.write(frame))await once(p.stdin,'drain');}p.stdin.end();await done;
 }
 validation.push({file:path.basename(file),id:r.id,shotPower:r.shotPower,holdMs:r.holdMs,width:WIDTH,height:HEIGHT,fps:FPS,duration:DURATION,frames:decode(file,DURATION*FPS),decoded:true,bytes:fs.statSync(file).size});console.log('Validated '+path.basename(file));
}
// Two independent encodes at a time; all physics was already generated serially.
let next=0;await Promise.all(Array.from({length:2},async()=>{while(next<runs.length)await encode(runs[next++]);}));
if(!previews){
 const comparisons=[
  {key:'a',title:'A — Hold progression',ids:[80,180,250,350,450,600].map(h=>`sp80-hold${h}`)},
  {key:'b',title:'B — Attribute progression',ids:[50,70,80,90,99].map(s=>`sp${s}-hold350`)},
  {key:'c',title:'C — Low vs max',ids:['sp50-hold80','sp50-hold600','sp90-hold80','sp90-hold600']}
 ];
 for(const c of comparisons){const stem=`comparison-${c.key}-behind-1x`,list=path.join(out,stem+'.txt'),file=path.join(out,stem+'.mp4');fs.writeFileSync(list,c.ids.map(id=>`file '${id}-behind-1x.mp4'`).join('\n')+'\n');execFileSync(ff,['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',file]);fs.unlinkSync(list);fs.copyFileSync(path.join(out,`${c.ids[0]}-behind-1x-preview.png`),path.join(out,stem+'-preview.png'));validation.push({file:path.basename(file),...c,format:'Sequential full-frame, contact synchronized 0.25s into each segment',width:WIDTH,height:HEIGHT,fps:FPS,duration:c.ids.length*DURATION,frames:decode(file,c.ids.length*DURATION*FPS),decoded:true,bytes:fs.statSync(file).size});}
 validation.sort((a,b)=>a.file.localeCompare(b.file));
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({pass:true,camera:CAMERA,allSubjectsInFrame:true,simulationSecondsPerVideoSecond:1,contactSecondsIntoEachClip:LEAD,segmentDuration:DURATION,fullPhysicalRangeShown:true,afterSleep:'Freeze the last authoritative sleeping state; no invented movement.',inputPresentation:'Contact synchronized; hold duration selects the pre-contact state. No controller, hold animation or contact-timing integration.',files:validation},null,2)+'\n');
}
