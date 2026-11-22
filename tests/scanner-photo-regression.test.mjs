import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');

test('android capture releases camera before native picker',()=>{
 assert.match(html,/function openScannerImagePicker\(id\)/);
 assert.match(html,/stopScan\(\);scannerMediaPickerPending=true/);
 assert.match(html,/case'camera-capture':openScannerImagePicker\('scanner-capture'\)/);
 assert.match(html,/case'camera-image':openScannerImagePicker\('scanner-file'\)/);
});
test('pause while external camera is open is not presented as scanner failure',()=>{
 assert.match(html,/scannerMediaPickerPending\?'Aguardando o retorno da câmera ou galeria nativa\.'/);
});
test('photo is resized once before decode and reused by all engines',()=>{
 assert.match(html,/async function prepareScannerImage\(file\)/);
 assert.match(html,/const prepared=await prepareScannerImage\(file\)/);
 assert.match(html,/decodeWithNativeDetector\(prepared,scanContext\)/);
 assert.match(html,/decodeWithOfflineEAN\(prepared,true\)/);
 assert.match(html,/scanner\.scanFile\(prepared,true\)/);
});
test('QR on a photo attempts light decoder before library fallback',()=>{
 const js=html.indexOf('decoded=await decodeWithJsQR(prepared)');
 const html5=html.indexOf('await loadHtml5Scanner();',js);
 assert.ok(js>=0&&html5>js);
});
test('camera photo failure is recoverable without reloading the Lumo app',()=>{
 assert.match(html,/Não foi possível ler a foto\. Toque em Foto para repetir/);
 assert.match(html,/Seleção cancelada\. Toque em Tentar novamente/);
});
test('photo is still allowed when optical QR does not resolve',()=>{
 assert.match(html,/case'retry-scan':/);
 assert.match(html,/case'camera-capture':/);
 assert.match(html,/case'camera-image':/);
});
