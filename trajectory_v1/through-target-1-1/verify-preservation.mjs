import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=path.dirname(new URL(import.meta.url).pathname),root=path.dirname(here),freeze=path.join(root,'passing-v1-approved');
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const check=(base,hashes)=>Object.entries(hashes).filter(([file,hash])=>!fs.existsSync(path.join(base,file))||digest(path.join(base,file))!==hash).map(([file])=>file);
const m=JSON.parse(fs.readFileSync(path.join(freeze,'freeze-manifest.json'))),protectedFiles=JSON.parse(fs.readFileSync(path.join(here,'protected-before.json'))),prod=JSON.parse(fs.readFileSync(path.join(root,'playtest/foundation/source-manifest.json')));
const result={tag:m.tag,freezeCommit:execFileSync('git',['rev-parse',m.tag],{cwd:freeze,encoding:'utf8'}).trim(),freezeStatus:execFileSync('git',['status','--porcelain'],{cwd:freeze,encoding:'utf8'}).trim(),passingFiles:m.fileCount,passingChanged:check(path.join(root,'passing'),m.source_sha256),frozenCopyChanged:check(path.join(freeze,'passing'),m.source_sha256),protectedLabFiles:Object.keys(protectedFiles).length,protectedLabChanged:check(root,protectedFiles),productionCommit:prod.commit,productionFiles:Object.keys(prod.hashes).length,productionChanged:check(prod.repo,prod.hashes)};
const fm=path.join(here,'foundation/manifest.json');if(fs.existsSync(fm)){const f=JSON.parse(fs.readFileSync(fm)),h=Object.fromEntries(f.files.map(x=>[x.path,x.sha256]));result.receiveFoundationFiles=f.files.length;result.receiveFoundationChanged=check(path.join(here,'foundation'),h);result.receiveSourceChanged=check(f.source,h);result.receiveFoundationVersion=f.interface;}
result.status=Object.entries(result).some(([k,v])=>k.endsWith('Changed')&&v.length)||result.freezeStatus?'FAIL':'PASS';
fs.writeFileSync(path.join(here,'preservation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,receiveFoundationManifest:result.receiveFoundationManifest?'recorded':undefined},null,2));if(result.status!=='PASS')process.exitCode=1;
