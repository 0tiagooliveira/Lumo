import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/experience.css',import.meta.url),'utf8');
const auth=readFileSync(new URL('../web/experience-auth.mjs',import.meta.url),'utf8');

for(const label of [
 'ORGANIZE SEM COMPLICAÇÃO','TUDO ORGANIZADO','DA NOTA PARA SEUS GASTOS',
 'IMPORTAÇÃO RÁPIDA','PERSONALIZE O APP','SUA IDENTIDADE',
 'SEU DIA MAIS LEVE COMEÇA AQUI','SUA LISTA ATIVA','Seu ritmo ✳',
 'Uma compra de cada vez. Sem correria.','LISTA DE COMPRAS',
 'NOTA FISCAL · ${esc(r.source)}'
]){
 test('requested label hidden: '+label,()=>assert.ok(!html.includes(label)));
}
test('cloud dock gone, cloud dialog and actions remain',()=>{
 assert.ok(!html.includes('id="lumo-cloud-dock"'));
 assert.ok(!auth.includes('dock.hidden'));
 assert.ok(html.includes('data-lumo-open-cloud'));
 assert.ok(html.includes('data-lumo-logout'));
 assert.ok(html.includes('id="lumo-cloud-panel"'));
 assert.ok(auth.includes("window.addEventListener('lumo:share',openCloudPanel)"));
});
test('historical features and advanced product photos are retained',()=>{
 for(const token of ['listProductArtwork','function onboarding()','function settingsScreen()',
 'function receiptAuditPanel(','BarcodeDetector','function mascotPicker(','function noteScreen()']){
  assert.ok(html.includes(token),token);
 }
});
test('critical CSS stays synchronized and responsive',()=>{
 assert.ok(html.includes('<style id="lumo-entry-critical">\n'+css.trim()+'\n</style>'));
 assert.ok(!css.includes('.lumo-cloud-dock'));
 assert.ok(css.includes('.lumo-gate-shell'));
 assert.ok(css.includes('.lumo-sr-only'));
});
test('unverified fiscal source persists as internal metadata',()=>{
 assert.ok(html.includes("source:'QR / chave fiscal (não verificado)'"));
 assert.ok(html.includes('<div class="eyebrow">Nota fiscal</div>'));
});
