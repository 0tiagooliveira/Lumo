import test from 'node:test';
import assert from 'node:assert/strict';
import {parseShoppingList} from '../web/shopping-list-parser.mjs';

const sample = [
 '[ ] ----🥘 Comidas e Alimentos Básicos',
 '[ ] Pão 3 R$ 19,77',
 '[ ] Leite líquido 4 R$ 15,96',
 '[X] Arroz 5 Kg R$',
 '[ ] Macarrão 1R$ 8,78',
 '[ ] Bolacha R$ 11,340',
 '[ ] ----🍹 Bebidas',
 '[ ] Chá R$ 7,29',
 '[ ] ----🧀 Congelados e Geladeira',
 '[ ] Frango 4 R$ 33,94',
 '[X] Lenço umedecido 3 R$',
 '[ ] ----🧽 Limpeza, Higiene e Afins',
 '[ ] Fio dental 1 R$ 17, 89',
 '[ ] ----💄 Beleza e Cuidados Pessoais',
 '[X] Fralda 95 e 100 R$',
 '[ ] 🧂 Outros',
 '[X] Pote R$',
 '[X] Pote R$'
].join('\n');
const out = parseShoppingList(sample);
test('cabeçalhos com emoji e checkboxes não viram produtos',()=>{
 assert.equal(out.headingCount, 6);
 assert.equal(out.items.length, 12);
 assert.equal(out.items.some(i=>i.name.includes('Comidas e Alimentos')),false);
});
test('estado dos checkboxes é preservado para revisão',()=>{
 assert.equal(out.items.find(i=>i.name==='Arroz').status,'bought');
 assert.equal(out.items.find(i=>i.name==='Chá').status,'pending');
});
test('quantidade com unidade e preço total são reconhecidos',()=>{
 const pao=out.items.find(i=>i.name==='Pão');
 assert.deepEqual([pao.qty,pao.unit,pao.totalCents,pao.unitPriceCents],[3,'un',1977,659]);
 const leite=out.items.find(i=>i.name==='Leite líquido');
 assert.deepEqual([leite.qty,leite.totalCents,leite.unitPriceCents],[4,1596,399]);
 const arroz=out.items.find(i=>i.name==='Arroz');
 assert.deepEqual([arroz.qty,arroz.unit,arroz.totalCents],[5,'kg',null]);
});
test('sem espaços antes de R$ funciona; centavos com espaços são normalizados',()=>{
 assert.equal(out.items.find(i=>i.name==='Macarrão').totalCents,878);
 assert.equal(out.items.find(i=>i.name==='Fio dental').totalCents,1789);
});
test('preços ambíguos e divisões que arredondam pedem revisão',()=>{
 assert.equal(out.items.find(i=>i.name==='Bolacha').totalCents,null);
 assert.equal(out.items.find(i=>i.name==='Bolacha').issues.length>0,true);
 assert.equal(out.items.find(i=>i.name==='Frango').issues.length>0,true);
 assert.equal(out.items.find(i=>i.name==='Frango').unitPriceCents,849);
});
test('tamanhos da fralda não viram quantidade 100',()=>{
 const f=out.items.find(i=>i.name==='Fralda 95 e 100');
 assert.equal(f.qty,1);
 assert.equal(f.issues.length>0,true);
});
test('nomes repetidos ficam visíveis para conferência sem duplicação invisível',()=>{
 assert.equal(out.duplicateCount,1);
 assert.equal(out.items.filter(i=>i.name==='Pote').length,2);
});
test('texto simples sem checkbox funciona',()=>{
 const result=parseShoppingList('Arroz\n2 feijão\nCafé R$ 18,50');
 assert.equal(result.items.length,3);
 assert.equal(result.items[2].totalCents,1850);
});
test('não infere preço a partir de R$ vazio',()=>{
 const r=parseShoppingList('[X] Leite em pó R$');
 assert.equal(r.items[0].totalCents,null);
 assert.equal(r.items[0].unitPriceCents,0);
});
