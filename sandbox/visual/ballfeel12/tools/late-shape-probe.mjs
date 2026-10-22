import fs from 'node:fs';import {simulate} from '../experiments.js';import {CURVES} from '../config.js';
const rows=[];
for(const high of [20.5,21.5,22])for(const gain of [5,7,9]){const law={...CURVES[2].law,highSpeed:high,lowSpeed:16,fadeLow:15.5,fadeHigh:18.5,early:.2,gain};const r=simulate({id:`late-${high}-${gain}`,initial:{v:[22.5,6.9,0],w:[0,80,0]},curveLaw:law,target:22,duration:5});rows.push({law,...r.metrics});}
fs.writeFileSync(new URL('../evidence/late-shape-probe.json',import.meta.url),JSON.stringify(rows,null,2));console.log(rows.map(r=>({high:r.law.highSpeed,gain:r.law.gain,peakX:r.peakCurvature.x,at10:r.planes[10]?.lateral,at20:r.planes[20]?.lateral,at22:r.planes[22]?.lateral,landX:r.firstLanding?.position?.[0],minVX:r.minForwardVelocity,maxX:r.maxForward})));
