import test from 'node:test';
import assert from 'node:assert/strict';
import {extractVoiceItem} from '../web/voice-intent.mjs';

const cases = [
  ['coloque na lista para mim arroz', 'arroz'],
  ['Coloca na minha lista para mim arroz', 'arroz'],
  ['adicione arroz', 'arroz'],
  ['Por favor, adicione 2 kg de açúcar', '2 kg de açúcar'],
  ['quero comprar chocolate', 'chocolate'],
  ['coloque na lista dois pacotes de arroz', '2 pacotes arroz'],
  ['preciso comprar três quilos de arroz', '3 kg arroz'],
  ['pão de forma', 'pão de forma'],
  ['chá de hortelã', 'chá de hortelã'],
  ['coloque na lista', ''],
  ['', '']
];
for(const [input, expected] of cases) {
  test('ditado interpreta: '+(input||'(vazio)'),()=>{
    assert.equal(extractVoiceItem(input).itemText, expected);
  });
}
test('comando não adiciona silenciosamente item ao banco',()=>{
  assert.deepEqual(Object.keys(extractVoiceItem('coloque na lista para mim arroz')).sort(), ['itemText','recognizedCommand']);
});
