import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {behindSVG,project,CAMERA,WIDTH,HEIGHT} from '../render.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH??'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ff=process.env.FFMPEG_PATH??'/Users/zainrahman/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/video-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'videos'),runs=JSON.parse(fs.readFileSync(path.join(root,'evidence/review.json'))).runs,fps=60,duration=2.2,lead=.25,validation=[];
fs.mkdirSync(out,{recursive:true});
const name=c=>`curve-${c}-behind-1x`,png=svg=>sharp(Buffer.from(svg)).png().toBuffer();
function decode(file,expected){const progress=execFileSync(ff,['-hide_banner','-loglevel','error','-i',file,'-progress','pipe:1','-f','null','-'],{encoding:'utf8'}),frames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);if(frames!==expected)throw Error('Frame count mismatch '+file);return frames;}
for(const r of runs){
 const points=[...r.keeper.frames.map(f=>f.p),r.scenario.origin,[83.6,1.82,25.7],[83.6,0,25.7],...[30.34,37.66].flatMap(z=>[[105,0,z],[105,2.44,z]])];
 if(points.some(p=>{const q=project(p);return q[3]<=0||q[0]<20||q[0]>WIDTH-20||q[1]<20||q[1]>HEIGHT-20;}))throw Error('Subject clipped at Curve '+r.curve);
 fs.writeFileSync(path.join(out,name(r.curve)+'-preview.png'),await png(behindSVG(r,.50)));
 if([75,99].includes(r.curve))for(const t of [0,.25,.75,1.1])fs.writeFileSync(path.join(root,'evidence',`frame-${r.curve}-${t.toFixed(2)}.png`),await png(behindSVG(r,t)));
 if(process.argv.includes('--previews'))continue;
 const file=path.join(out,name(r.curve)+'.mp4'),p=spawn(ff,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file]);let err='';p.stderr.on('data',b=>err+=b);const done=new Promise((ok,no)=>p.on('close',code=>code===0?ok():no(Error(err))));
 for(let i=0;i<Math.round(duration*fps);i++){const frame=await png(behindSVG(r,i/fps-lead));if(!p.stdin.write(frame))await new Promise(ok=>p.stdin.once('drain',ok));}p.stdin.end();await done;
 validation.push({file:path.basename(file),curve:r.curve,width:WIDTH,height:HEIGHT,fps,duration,frames:decode(file,Math.round(duration*fps)),decoded:true,bytes:fs.statSync(file).size});console.log('Encoded and decoded '+path.basename(file));
}
if(!process.argv.includes('--previews')){
 const list=path.join(out,'comparison-inputs.txt');fs.writeFileSync(list,[50,75,90,99].map(c=>`file '${name(c)}.mp4'`).join('\n')+'\n');
 const comparison=path.join(out,'comparison-50-75-90-99-behind-1x.mp4');execFileSync(ff,['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',comparison]);fs.unlinkSync(list);
 fs.copyFileSync(path.join(out,name(50)+'-preview.png'),path.join(out,'comparison-50-75-90-99-behind-1x-preview.png'));
 validation.push({file:path.basename(comparison),ratings:[50,75,90,99],format:'Sequential full-frame; identical contact timing in each segment',width:WIDTH,height:HEIGHT,fps,duration:4*duration,frames:decode(comparison,4*Math.round(duration*fps)),decoded:true,bytes:fs.statSync(comparison).size});
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({pass:true,camera:CAMERA,allSubjectsInFrame:true,simulationSecondsPerVideoSecond:1,contactSecondsIntoEachClip:lead,afterGoal:'Freeze final authoritative keeper replay frame; no invented net continuation',files:validation},null,2)+'\n');
}
