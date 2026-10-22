import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {comparisonSVG,diagnosticSVG,overlaySVG} from '../render.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH??'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ff=process.env.FFMPEG_PATH??'/Users/zainrahman/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/video-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'videos'),runs=JSON.parse(fs.readFileSync(path.join(root,'evidence/review.json'))).runs,validation=[],jobs=[];
for(const scenario of ['A','B']){
 for(const all of [false,true]){const name=`${scenario}-top-down${all?'-all-ratings':''}`,svg=overlaySVG(runs,scenario,{all});fs.writeFileSync(path.join(root,'evidence',name+'.svg'),svg);fs.writeFileSync(path.join(root,'evidence',name+'.png'),await sharp(Buffer.from(svg)).png().toBuffer());}
 for(const r of runs.filter(r=>r.scenario.id===scenario&&r.mode==='fixed')){const name=`${scenario}-curve-${r.curve}-trajectory`,svg=overlaySVG([r],scenario,{all:true});fs.writeFileSync(path.join(root,'evidence',name+'.svg'),svg);fs.writeFileSync(path.join(root,'evidence',name+'.png'),await sharp(Buffer.from(svg)).png().toBuffer());}
 for(const mode of ['fixed','targeted'])jobs.push({name:`${scenario}-${mode}-50-75-90-99-1x`,draw:t=>comparisonSVG(runs,scenario,mode,t),duration:2.2,fps:60,rate:1});
 jobs.push({name:`${scenario}-fixed-0-75-99-1x`,draw:t=>comparisonSVG(runs,scenario,'fixed',t,{ratings:[0,75,99]}),duration:2.2,fps:60,rate:1});
 for(const curve of [50,75,90,99]){const r=runs.find(r=>r.scenario.id===scenario&&r.curve===curve&&r.mode==='fixed');jobs.push({name:`${scenario}-curve-${curve}-four-cameras-half-speed`,draw:t=>diagnosticSVG(r,t),duration:4.4,fps:30,rate:.5});}
}
for(const job of jobs){const {name,draw,duration,fps,rate}=job;
 fs.writeFileSync(path.join(out,name+'-preview.png'),await sharp(Buffer.from(draw(.72))).png().toBuffer());if(process.argv.includes('--previews'))continue;
 const file=path.join(out,name+'.mp4'),p=spawn(ff,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file]);let err='';p.stderr.on('data',b=>err+=b);const done=new Promise((ok,no)=>p.on('close',code=>code===0?ok():no(Error(err))));
 for(let i=0;i<Math.round(duration*fps);i++){const png=await sharp(Buffer.from(draw(i/fps*rate))).png().toBuffer();if(!p.stdin.write(png))await new Promise(r=>p.stdin.once('drain',r));}p.stdin.end();await done;
 const progress=execFileSync(ff,['-hide_banner','-loglevel','error','-i',file,'-progress','pipe:1','-f','null','-'],{encoding:'utf8'}),decodedFrames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);if(decodedFrames!==Math.round(duration*fps))throw Error('Frame count mismatch '+name);
 validation.push({file:name+'.mp4',width:1920,height:1096,fps,duration,frames:decodedFrames,simulationSecondsPerVideoSecond:rate,synchronizedAt:'authoritative contact t=0',decoded:true,bytes:fs.statSync(file).size});console.log('encoded and decoded',name);
}
if(!process.argv.includes('--previews'))fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({pass:true,files:validation},null,2)+'\n');
