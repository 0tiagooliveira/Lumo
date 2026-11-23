import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const match=html.match(/function receiptKnownTotal\(r\)\{[^\n]*\}\nfunction receiptTotalDisplay\(r\)\{[^\n]*\}/);
assert.ok(match,'Funções de apresentação do total fiscal devem existir');
const display=new Function('money',match[0]+';return receiptTotalDisplay;')(
 cents=>'R$ '+(Number(cents)/100).toFixed(2).replace('.',','));

test('nota QR com valor desconhecido não é exibida como R$ 0,00',()=>{
 assert.equal(display({source:'QR / chave fiscal (não verificado)',totalCents:0,items:[]}), 'Valor não informado');
});
test('nota com total importado apresenta o valor verdadeiro',()=>{
 assert.equal(display({source:'XML fiscal',totalCents:1334,items:[{}]}),'R$ 13,34');
});
test('total zero digitado e confirmado não é confundido com valor ausente',()=>{
 assert.equal(display({source:'Registro manual',totalCents:0,totalConfirmed:true}),'R$ 0,00');
});
test('a revisão do QR não pré-preenche valor desconhecido como zero',()=>{
 assert.match(html,/Valor total \(R\$\) — se conhecido/);
 assert.match(html,/placeholder="Ainda não informado"/);
});
test('revisão permite ver detalhes fiscais sem obrigar longa rolagem',()=>{
 assert.match(html,/Ver dados técnicos e chave fiscal/);
});
test('o aplicativo não afirma consulta SEFAZ antes de abrir o portal',()=>{
 assert.match(html,/QR reconhecido; os produtos ainda não foram importados/);
});
