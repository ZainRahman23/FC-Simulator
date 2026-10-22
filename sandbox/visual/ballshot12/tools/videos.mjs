import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {comparisonSVG} from '../render.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_PATH??'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ff=process.env.FFMPEG_PATH??'/Users/zainrahman/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/video-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'videos'),runs=JSON.parse(fs.readFileSync(path.join(root,'evidence/review.json'))).runs;
fs.mkdirSync(out,{recursive:true});const validation=[];
for(const family of ['LACES','POWER','CHIP']){
 const name=family.toLowerCase()+'-ratings-1x',draw=t=>comparisonSVG(runs,family,t),duration=family==='CHIP'?3:2.5,fps=60;
 fs.writeFileSync(path.join(out,name+'-preview.png'),await sharp(Buffer.from(draw(family==='CHIP'?.85:.65))).png().toBuffer());
 if(process.argv.includes('--previews'))continue;
 const file=path.join(out,name+'.mp4'),p=spawn(ff,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file]);let err='';p.stderr.on('data',b=>err+=b);const done=new Promise((ok,no)=>p.on('close',code=>code===0?ok():no(Error(err))));
 for(let i=0;i<duration*fps;i++){const png=await sharp(Buffer.from(draw(i/fps))).png().toBuffer();if(!p.stdin.write(png))await new Promise(r=>p.stdin.once('drain',r));}
 p.stdin.end();await done;
 const progress=execFileSync(ff,['-hide_banner','-loglevel','error','-i',file,'-progress','pipe:1','-f','null','-'],{encoding:'utf8'});
 const decodedFrames=Number([...progress.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1]);if(decodedFrames!==duration*fps)throw Error('Decoded frame count mismatch '+name);
 validation.push({file:path.basename(file),width:1920,height:1032,fps,duration,frames:duration*fps,simulationSecondsPerVideoSecond:1,synchronizedAt:'authoritative contact t=0',decoded:true,bytes:fs.statSync(file).size});console.log('encoded and decoded',name);
}
if(!process.argv.includes('--previews'))fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({pass:true,files:validation},null,2)+'\n');
