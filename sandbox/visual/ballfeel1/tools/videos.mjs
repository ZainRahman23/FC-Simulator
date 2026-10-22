import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createRequire} from 'node:module';import {feelSVG} from '../render.js';import {sceneSVG} from '../../ballphys1/render.js';
import {actionExperiment} from '../experiments.js';
const require=createRequire(import.meta.url),sharp=require(process.env.BALL_SHARP||'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const data=JSON.parse(fs.readFileSync(new URL('../evidence/review.json',import.meta.url))),out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});const ffmpeg=process.env.BALL_FFMPEG||'ffmpeg',manifest=[];
async function encode(id,segments,{clean=false,diagnostic=false}={}){
 const file=path.join(out,id+'.mp4');
 const child=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['pipe','ignore','pipe']});let errors='';child.stderr.on('data',x=>errors+=x);const completion=once(child,'close');let frame=0;const timings=[];
 for(const s of segments){const count=Math.ceil(s.duration*30),start=frame/30;timings.push({scene:s.id,candidate:s.candidate??null,start,seconds:count/30});
  for(let i=0;i<count;i++){const t=i/30,svg=diagnostic?sceneSVG(s,t,{width:1280,height:720,camera:'close',debug:!clean}):feelSVG(s,t,{width:1280,height:720,debug:false,label:!clean});const buffer=await sharp(Buffer.from(svg)).png().toBuffer();if(!child.stdin.write(buffer))await once(child.stdin,'drain');frame++;
   if(i===Math.min(count-1,Math.round((s.metrics?.arrival?.time??.7)*30))&&(s.candidate==='balanced'||segments.length===1))await sharp(buffer).png().toFile(path.join(out,id+'-preview.png'));
  }
 }
 child.stdin.end();const [code]=await completion;if(code!==0)throw Error(errors);manifest.push({file:id+'.mp4',width:1280,height:720,fps:30,playback:'1×',clean,diagnostic,seconds:frame/30,segments:timings});console.log(id,frame+' frames');
}
for(const family of Object.keys(data.families)){const scenes=data.actions.filter(s=>s.family===family);await encode(family,scenes);await encode(family+'-clean',scenes.filter(s=>s.candidate==='balanced'),{clean:true});}
await encode('shots',['placed','shot','power'].map(f=>actionExperiment(f,'balanced',undefined,{distance:18})));
await encode('aerial',[...['loft','cross','chip'].map(f=>data.actions.find(s=>s.family===f&&s.candidate==='balanced'))]);
await encode('global-surfaces',data.globals.map(g=>({...g.pass,candidate:g.id})));
await encode('low-speeds',data.low.map(r=>({...r,target:5,candidate:r.title})));
for(const id of ['tackle-loose','blocked-shot','post-rebound'])await encode(id,[data.regressions.find(s=>s.id===id)],{diagnostic:true});
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
