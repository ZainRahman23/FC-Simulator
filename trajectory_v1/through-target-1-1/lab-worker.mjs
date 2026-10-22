import {prepareScenario,simulateRun} from './core.mjs?v=4';
onmessage=async e=>{try{const p=await prepareScenario(e.data.input);const run=simulateRun(p);postMessage({run});}catch(error){postMessage({error:error.stack??String(error)});}};
