import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';

// Contract for the historically approved v1.7 UX. Presence in source does
// not certify functionality with a real camera, browser, API or second phone.
const historical = readFileSync(new URL('../legacy/Lumo_MVP_v1.7.html', import.meta.url), 'utf8');
const current = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

const flows = [
  ['onboarding', 'function onboarding()'],
  ['7 fruit mascots', 'const FRUITS=['],
  ['mascot picker', 'function mascotPicker('],
  ['brand palette', 'BRAND_PALETTE'],
  ['home', "case'home':body=home()"],
  ['shopping lists', "case'lists':body="],
  ['shopping cart', "case'purchase':body="],
  ['purchase history', "case'history':body="],
  ['fiscal receipt', "case'note':body="],
  ['settings', 'function settingsScreen()'],
  ['barcode scanner', 'BarcodeDetector'],
  ['camera permission', 'navigator.mediaDevices'],
  ['catalogue', 'function marketCatalogSettings('],
  ['backup export', 'backup-export'],
  ['backup import', 'backup-import'],
  ['list sharing', 'function shareList('],
  ['five navigation destinations', 'data-to="purchase"'],
];

for (const [label, token] of flows) {
  test(`the restored app retains ${label}`, () => {
    assert.ok(historical.includes(token), `Incorrect historical token: ${label}`);
    assert.ok(current.includes(token), `Regression: current app lost ${label}`);
  });
}

test('the restored homepage still uses original SVG mascot data', () => {
  assert.ok(current.includes('mascot-svg'));
  for (const id of ['orange','strawberry','lemon','blueberry','peach','avocado','watermelon']) {
    assert.match(current, new RegExp(`id:'${id}'`), `Missing historical mascot: ${id}`);
  }
});

test('the restored interface contains the Google identity adapter', () => {
  assert.ok(current.includes('experience-auth.mjs'));
  assert.ok(current.includes('lumo-identity-gate'));
  const authModule = readFileSync(new URL('../web/experience-auth.mjs', import.meta.url), 'utf8');
  assert.ok(authModule.includes('experience-sync.mjs'));
});
