import {simulateShot} from './experiments.js';
self.onmessage=({data})=>{try{const run=simulateShot({holdMs:data.holdMs,shotPower:data.shotPower});self.postMessage({token:data.token,run});}catch(error){self.postMessage({token:data.token,error:error.message});}};
