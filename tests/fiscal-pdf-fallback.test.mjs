import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFiscalPdfFallback} from '../web/fiscal-pdf-fallback.mjs';
test('layout tabular de NFC-e com valores e quantidades',()=>{
 const p=parseFiscalPdfFallback('DANFE NFC-e - DOCUMENTO AUXILIAR DA NOTA FISCAL\nARROZ INTEGRAL 1KG 2 UN 5,50 11,00\nCHÁ HORTELÃ 1 UN 7,29 7,29\nValor total da nota R$ 18,29');
 assert.equal(p.items.length,2);
 assert.equal(p.items[0].qty,2);
 assert.equal(p.items[0].unitPriceCents,550);
 assert.equal(p.items[1].totalCents,729);
 assert.equal(p.totalCents,1829);
 assert.equal(p.store,'');
});
test('layout fiscal em blocos com Cód., Qtde, UN, Vl. Unit. e Vl. Total',()=>{
 const p=parseFiscalPdfFallback('NOTA FISCAL DE CONSUMIDOR ELETRÔNICA\nMACARRÃO 500G (Cód.: 12345)\nQtd.: 3\nUN: UN\nVl. Unit.: 2,90\nVl. Total: 8,70\nValor a pagar: R$ 8,70\nEmissão: 22/11/2026');
 assert.equal(p.items.length,1);
 assert.equal(p.items[0].name,'MACARRÃO 500G');
 assert.equal(p.date,'2026-11-22');
 assert.equal(p.totalCents,870);
});
test('não inventa itens quando existe apenas uma chave fiscal',()=>{
 assert.equal(parseFiscalPdfFallback('NOTA FISCAL\nCHAVE DE ACESSO\n12345678901234567890123456789012345678901234\nTOTAL DA NOTA R$ 24,00').items.length,0);
});
test('não importa lista de compras sem contexto fiscal',()=>{
 assert.equal(parseFiscalPdfFallback('Lista de compras\nARROZ 2 UN 5,50 11,00\nCHÁ 1 UN 7,29 7,29').items.length,0);
});
test('não aceita produto cujo preço não corresponde à quantidade',()=>{
 assert.equal(parseFiscalPdfFallback('NOTA FISCAL\nARROZ 2 UN 5,50 190,00\nValor total da nota R$ 190,00').items.length,0);
});
test('valor fiscal ausente continua desconhecido',()=>{
 const p=parseFiscalPdfFallback('DANFE NFC-e\nARROZ 2 UN 5,50 11,00');
 assert.equal(p.items.length,1);
 assert.equal(p.totalCents,null);
});
