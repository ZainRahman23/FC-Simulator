import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {once} from 'node:events';import {fileURLToPath} from 'node:url';
import {behindSVG,project,CAMERA,WIDTH,HEIGHT} from '../render.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH??'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ff=process.env.FFMPEG_PATH??'/Users/zainrahman/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/video-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'videos'),review=JSON.parse(fs.readFileSync(path.join(root,'evidence/review.json'))),runs=[...review.runs,...review.candidateRuns];
const FPS=60,DURATION=5.2,LEAD=.25,validation=[],previews=process.argv.includes('--previews'),reuse=process.argv.includes('--reuse');
const png=svg=>sharp(Buffer.from(svg)).png({compressionLevel:1}).toBuffer();fs.mkdirSync(out,{recursive:true});
function decode(file,expected){const progress=execFileSync(ff,['-hide_banner','-loglevel','error','-i',file,'-progress','pipe:1','-f','null','-'],{encoding:'utf8'}),frames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);if(frames!==Math.round(expected))throw Error('Frame count mismatch '+file);return frames;}
async function encode({id,selected,comparison=false}){
 for(const r of selected){const points=[...r.frames.map(f=>f.p),[85.6,1.82,33.7],[85.6,0,33.7],...[30.34,37.66].flatMap(z=>[[105,0,z],[105,2.44,z]])];if(points.some(p=>{const q=project(p);return q[3]<=0||q[0]<20||q[0]>WIDTH-20||q[1]<20||q[1]>HEIGHT-20;}))throw Error('Subject clipped '+r.id);if(r.duration+LEAD>DURATION)throw Error('Sleep outside clip '+r.id);}
 const render=t=>behindSVG(selected[0],t,comparison?selected:null);
 fs.writeFileSync(path.join(out,id+'-preview.png'),await png(render(comparison?.7:.35)));
 if(previews)return;
 const file=path.join(out,id+'.mp4');
 if(!reuse||!fs.existsSync(file)){
  const p=spawn(ff,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-r',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file]);let err='';p.stderr.on('data',b=>err+=b);const done=new Promise((ok,no)=>{p.on('error',no);p.on('close',code=>code===0?ok():no(Error(err)));});
  for(let i=0;i<Math.round(DURATION*FPS);i++){const frame=await png(render(i/FPS-LEAD));if(!p.stdin.write(frame))await once(p.stdin,'drain');}p.stdin.end();await done;
 }
 validation.push({file:path.basename(file),runIds:selected.map(r=>r.id),format:comparison?'Five simultaneous independent physical replays, same contact time and camera':'Single physical replay',width:WIDTH,height:HEIGHT,fps:FPS,duration:DURATION,frames:decode(file,DURATION*FPS),decoded:true,bytes:fs.statSync(file).size});console.log('Validated '+path.basename(file));
}
const jobs=runs.map(r=>({id:r.id+'-behind-1x',selected:[r]}));
for(const [key,hold] of [['max',600],['normal',350],['tap',80]])jobs.push({id:'comparison-'+key+'-behind-1x',selected:review.runs.filter(r=>r.holdMs===hold),comparison:true});
let next=0;await Promise.all(Array.from({length:2},async()=>{while(next<jobs.length)await encode(jobs[next++]);}));
if(!previews){
 const id='comparison-charge-behind-1x',ids=[80,180,250,350,450,600].map(h=>`sp80-hold${h}`),list=path.join(out,id+'.txt'),file=path.join(out,id+'.mp4');fs.writeFileSync(list,ids.map(r=>`file '${r}-behind-1x.mp4'`).join('\n')+'\n');execFileSync(ff,['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',file]);fs.unlinkSync(list);fs.copyFileSync(path.join(out,'sp80-hold80-behind-1x-preview.png'),path.join(out,id+'-preview.png'));
 validation.push({file:path.basename(file),runIds:ids,format:'Sequential charge progression, each contact 0.25s into segment',width:WIDTH,height:HEIGHT,fps:FPS,duration:Math.round(ids.length*DURATION*1000)/1000,frames:decode(file,ids.length*DURATION*FPS),decoded:true,bytes:fs.statSync(file).size});validation.sort((a,b)=>a.file.localeCompare(b.file));
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({pass:true,camera:CAMERA,allSubjectsInFrame:true,simulationSecondsPerVideoSecond:1,contactSecondsIntoEachClip:LEAD,segmentDuration:DURATION,fullPhysicalRangeShown:true,mainCases:30,endpointCandidateCases:20,comparisonCount:4,afterSleep:'Freeze the final authoritative sleeping state.',comparisonTrails:'Drawn only from actual sampled first-flight positions; never consumed by physics.',files:validation},null,2)+'\n');
}
