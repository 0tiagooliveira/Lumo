import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';

const index=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/experience.css',import.meta.url),'utf8');
const auth=readFileSync(new URL('../web/experience-auth.mjs',import.meta.url),'utf8');

const removedCopy=[
 'SEU DIA MAIS LEVE COMEÇA AQUI',
 'SUA LISTA ATIVA',
 'Uma compra de cada vez. Sem correria.',
 'Seu ritmo ✳',
 'ORGANIZE SEM COMPLICAÇÃO',
 'TUDO ORGANIZADO',
 'DA NOTA PARA SEUS GASTOS',
 'IMPORTAÇÃO RÁPIDA',
 'PERSONALIZE O APP',
 'SUA IDENTIDADE',
 'LISTA DE COMPRAS',
 'Os dados ficam neste navegador.'
];
for(const copy of removedCopy){
 test('remove copy: '+copy,()=>assert.ok(!index.includes(copy),copy));
}

test('keeps cloud and logout actions available in settings without an upper dock',()=>{
 assert.ok(!index.includes('id="lumo-cloud-dock"'));
 assert.ok(index.includes('data-lumo-open-cloud'));
 assert.ok(index.includes('data-lumo-logout'));
 assert.ok(index.includes('id="lumo-cloud-panel"'));
 assert.ok(auth.includes('openCloudPanel()'));
 assert.ok(auth.includes('void signOut()'));
});
test('receipt source validation remains in internal data and audit despite heading cleanup',()=>{
 assert.ok(index.includes("source:'QR / chave fiscal (não verificado)'"));
 assert.ok(index.includes('function receiptAuditPanel('));
 assert.ok(!index.includes('NOTA FISCAL · ${esc(r.source)}'));
});
test('login has responsive bounds and a real Google login action',()=>{
 assert.ok(index.includes('id="lumo-login-google"'));
 assert.ok(index.includes('🍊'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'));
 assert.ok(css.includes('width:min(100%,450px)'));
 assert.ok(auth.includes('beginGoogle()'));
});
