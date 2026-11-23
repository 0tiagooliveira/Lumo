import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const preview=readFileSync(new URL('../scripts/preview-firebase.ps1',import.meta.url),'utf8');
test('script de prévia nunca usa deploy live',()=>{
 assert.match(preview,/hosting:channel:deploy/);
 assert.doesNotMatch(preview,/firebase deploy --only hosting/);
});
test('previa identifica SHA, exige branch correta e testes',()=>{
 assert.match(preview,/git rev-parse HEAD/);
 assert.match(preview,/codex\/public-release-2026-11-22/);
 assert.match(preview,/npm run check/);
});
test('previa aborta se site ou projeto forem diferentes',()=>{
 assert.match(preview,/lumo-515518/);
 assert.match(preview,/uselumo/);
 assert.match(preview,/hosting:sites:list/);
});
test('preview nao publica com working tree suja',()=>{
 assert.match(preview,/git status --porcelain/);
});
