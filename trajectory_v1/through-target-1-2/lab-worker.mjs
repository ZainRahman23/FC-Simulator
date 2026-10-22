import {prepareScenario,simulateRun} from './core.mjs?v=1';
onmessage=async e=>{try{const p=await prepareScenario(e.data.input),current=simulateRun(p,{navigation:'current'}),run=simulateRun(p);postMessage({run,current});}catch(error){postMessage({error:error.stack??String(error)});}};
