// Publication verification only; no gameplay source or recorded reference is changed.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {makeReview} from '../sandbox/visual/curve11/experiments.js';
import {simulateShot} from '../sandbox/visual/shotcharge13/experiments.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const curve=read('../sandbox/visual/curve11/evidence/review.json');assert.equal(hash(makeReview()),curve.parity.sha256,'CURVE-1.1 complete recorded replay');
const payload=r=>({velocity:r.action.velocity,spin:r.action.spin,position:r.action.position,frames:r.frames,events:r.events.map(({id,metadata,...e})=>e),stats:r.stats});
const review=read('../sandbox/visual/shotcharge13/evidence/review.json'),measurements=read('../sandbox/visual/shotcharge13/evidence/measurements.json');let count=1;
for(const r of [...review.runs,...measurements.manualFinalReplays]){const a=simulateShot({shotPower:r.shotPower,holdMs:r.holdMs});assert.equal(hash(payload(a)),r.physicalSha256,'Recorded Laces replay '+r.holdMs);count++;}
console.log(JSON.stringify({status:'PASS',exactSavedReplayHashes:count,mode:process.execArgv,node:process.version}));
