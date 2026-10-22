import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),repo=path.resolve(root,'../../..'),workspace=path.resolve(repo,'../..'),out=path.join(workspace,'outputs/SHOT-CHARGE-1.2'),preview=process.argv.includes('--preview');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.mkdirSync(out,{recursive:true});
const copied=new Set();
function copyModule(source){
 source=path.resolve(source);if(copied.has(source))return;copied.add(source);
 const rel=path.relative(repo,source),dest=path.join(out,'source',rel);if(rel.startsWith('..'))throw Error('Unexpected module outside repo');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
 const text=fs.readFileSync(source,'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){if(match[1].startsWith('.'))copyModule(path.resolve(path.dirname(source),match[1]));}
}
for(const f of ['live.js','worker.js'])copyModule(path.join(root,f));
fs.copyFileSync(path.join(root,'live.css'),path.join(out,'source/sandbox/visual/shotcharge12/live.css'));
for(const n of ['live.html','review.html','report.html','README.md'])if(fs.existsSync(path.join(root,n)))fs.copyFileSync(path.join(root,n),path.join(out,n));
for(const n of ['evidence','videos'])if(fs.existsSync(path.join(root,n)))fs.cpSync(path.join(root,n),path.join(out,n),{recursive:true});
fs.writeFileSync(path.join(out,'source/package.json'),'{"type":"module"}\n');
if(!preview){
 const read=n=>JSON.parse(fs.readFileSync(path.join(root,n))),tests=read('evidence/tests.json'),ui=read('evidence/ui-validation.json'),videos=read('videos/validation.json'),frozen=read('evidence/preservation.json');
 if(tests.status!=='PASS'||!ui.pass||!videos.pass||videos.files.length!==14)throw Error('Missing final validation');
 for(const f of frozen.files)if(hash(fs.readFileSync(path.join(repo,f.file)))!==f.sha256)throw Error('Frozen source changed '+f.file);
 for(const f of frozen.historicalOutputs)if(hash(fs.readFileSync(path.join(workspace,f.file)))!==f.sha256)throw Error('Frozen output changed '+f.file);
 const links=[];for(const name of ['live.html','review.html','report.html'])for(const m of fs.readFileSync(path.join(out,name),'utf8').matchAll(/(?:href|src|poster)="([^"]+)"/g)){const p=m[1].split(/[?#]/)[0];if(p&&!fs.existsSync(path.join(out,p)))throw Error('Missing '+p);links.push(m[1]);}
 const sourceChecks=[...copied].map(file=>({file:path.relative(repo,file),sha256:hash(fs.readFileSync(file))}));for(const f of sourceChecks)if(hash(fs.readFileSync(path.join(out,'source',f.file)))!==f.sha256)throw Error('Source copy mismatch');
 fs.writeFileSync(path.join(out,'PACKAGE-VALIDATION.json'),JSON.stringify({pass:true,sourceFiles:sourceChecks.length,sourceCopiesExact:true,htmlLinksExist:true,frozenSourcesVerified:frozen.files.length,historicalOutputsVerified:frozen.historicalOutputs.length,checks:tests.checkCount,ui,videos,sourceChecks,links},null,2)+'\n');
}
console.log(JSON.stringify({preview,modules:copied.size,out}));
