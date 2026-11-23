import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const cfg=JSON.parse(readFileSync(new URL('../firebase.json',import.meta.url),'utf8'));
test('hosting aponta explicitamente para o domínio de destino',()=>{
 assert.equal(cfg.hosting.site,'uselumo');
 assert.equal(cfg.hosting.public,'web');
});
test('o deploy não depende do arquivo html legado como raiz',()=>{
 assert.ok(existsSync(new URL('../web/index.html',import.meta.url)));
 assert.notEqual(cfg.hosting.public,'legacy');
});
test('não deixar o index.html antigo indefinidamente no cache',()=>{
 const route=cfg.hosting.headers.find(h=>h.source==='/index.html');
 assert.ok(route);
 assert.ok(route.headers.some(h=>h.key.toLowerCase()==='cache-control'&&h.value==='no-store'));
});
