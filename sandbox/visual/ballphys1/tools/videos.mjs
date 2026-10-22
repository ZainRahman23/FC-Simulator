import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';import {sceneSVG} from '../render.js';
const require=createRequire(import.meta.url),sharp=require(process.env.BALL_SHARP||'/Users/zainrahman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const data=JSON.parse(fs.readFileSync(new URL('../evidence/review.json',import.meta.url))),target=path.resolve(process.argv[2]),scratch=path.resolve(process.argv[3]);fs.mkdirSync(target,{recursive:true});fs.mkdirSync(scratch,{recursive:true});
const ids=['tackle-loose','blocked-shot','curved-shot','slide-roll','post-rebound','drop-1','ground-pass','driven-pass','lofted-pass','power-shot','chip','shin-deflection','boot-deflection','crossbar'];
const requested=process.argv[4]?ids.filter(x=>x===process.argv[4]):ids;
for(const id of requested){const s=data.scenes.find(s=>s.id===id),contact=s.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider!=='turf')||s.events.find(e=>e.kind==='PHYSICAL_CONTACT');
 const normalDuration=s.duration,slowStart=Math.max(0,(contact?.time??.8)-.18),slowEnd=Math.min(s.duration,slowStart+(contact?.collider==='turf'?.9:1.1)),nNormal=Math.ceil((normalDuration+.4)*30),nSlow=Math.ceil((slowEnd-slowStart)*4*30);
 const dir=path.join(scratch,id);fs.mkdirSync(dir,{recursive:true});const paths=[];
 for(let i=0;i<nNormal+nSlow;i++){
  const slow=i>=nNormal,t=slow?slowStart+(i-nNormal)/120:Math.min(normalDuration,i/30);
  const main=sceneSVG(s,t,{width:960,height:540,camera:'close',debug:slow,label:s.title+(slow?' · 0.25×':' · 1×')});
  const inset=sceneSVG(s,t,{width:300,height:250,camera:'contact',debug:false,label:'CONTACT CLOSE VIEW'}).replace('<svg ','<svg x="646" y="114" ');
  const svg=main.replace('</svg>',`<rect x="642" y="110" width="308" height="258" rx="6" fill="#345247"/>${inset}</svg>`);
  const file=path.join(dir,String(i).padStart(5,'0')+'.png');await sharp(Buffer.from(svg)).png().toFile(file);paths.push(file);
  if(i===nNormal+20)await sharp(Buffer.from(svg)).png().toFile(path.join(target,id+'-preview.png'));
 }
 const video=path.join(target,id+'.mp4');if(fs.existsSync(video)&&!process.env.BALL_REEXPORT)throw Error('Refusing to replace existing export '+video);
 const r=spawnSync(process.env.BALL_FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','30','-i',path.join(dir,'%05d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',video],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);console.log(`Encoded ${id}: ${nNormal+nSlow} frames`);
 for(const file of paths)fs.unlinkSync(file);fs.rmdirSync(dir);
}
