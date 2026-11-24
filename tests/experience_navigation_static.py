"""Run original MVP interactions in Chromium about:blank for visual/navigation parity.
This intentionally avoids any live browser API, server, camera or OAuth claim.
"""
import asyncio
from pathlib import Path
from tempfile import gettempdir
from playwright.async_api import async_playwright
HTML=(Path(__file__).resolve().parents[1]/'web/index.html').read_text()
HTML=HTML.replace('<script type="module" src="./experience-auth.mjs"></script>','').replace('<link rel="stylesheet" href="./experience.css">','')
# This fixture stands in for a completed Google login. Real CSS is embedded
# in the document, so use the same authenticated body class as production.
HTML=HTML.replace('<body>','<body class="lumo-authenticated"><style>body #lumo-identity-gate{display:none!important}body #app{visibility:visible!important}</style>',1)

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(HTML)
  await page.evaluate("() => { window.__lumoUserId='visual-test'; window.dispatchEvent(new Event('lumo:auth-ready'));}")
  await page.wait_for_timeout(250)
  assert await page.locator('.mascot-svg').count()>=1
  await page.locator('[data-action="onboard-skip"]').click()
  await page.locator('[data-action="onboard-next"]').click()
  await page.wait_for_timeout(150)
  assert await page.locator('.bottom-nav button').count()==5, 'Navigation of original MVP not restored'
  assert await page.locator('.quick-form input[name="text"]').count()==1,'Quick-add missing after onboarding'
  await page.locator('.quick-form input[name="text"]').fill('2 leite')
  await page.locator('form[data-form="quick-add"] button[type="submit"]').click()
  await page.wait_for_timeout(120)
  count=await page.evaluate('window.LumoLegacy.getState().items.length')
  assert count==1,f'Item was not created: {count}'
  assert 'leite' in (await page.locator('body').inner_text()).lower()
  print('onboarding, 5 navigation tabs, quick add 2 leite: PASS')

  # Product photo is resolved by the same GTIN in the embedded catalog; the
  # image is mocked at the network edge, not invented or downloaded by CI.
  await page.route('https://edge.osuper.com.br/**',lambda r:r.fulfill(
   status=200,content_type='image/svg+xml',
   body='<svg xmlns="http://www.w3.org/2000/svg" width="43" height="43"><rect width="43" height="43" fill="white"/></svg>'))
  await page.evaluate("""() => window.LumoLegacy.applyRemote(s => {
   s.items.push({id:'photo-ean-check',listId:s.activeListId,barcode:'7891910000197',
    name:'Açúcar Refinado União 1kg',imageUrl:'',details:'',category:'Mercearia',
    qty:1,unit:'un',unitPriceCents:339,status:'pending',createdAt:new Date().toISOString()});
   s.items.push({id:'photo-fallback-check',listId:s.activeListId,barcode:'',
    name:'Produto sem foto correspondente',imageUrl:'https://untrusted.invalid/malicious.jpg',
    details:'',category:'Mercearia',qty:1,unit:'un',unitPriceCents:0,status:'pending',
    createdAt:new Date().toISOString()});
  })""")
  await page.locator('[data-action="nav"][data-to="lists"]').last.click()
  await page.locator('[data-action="open-list"]').first.click()
  photo=page.locator('[data-item-id="photo-ean-check"] img.item-photo')
  assert await photo.count()==1,'Known GTIN must display its real catalog photo'
  assert 'edge.osuper.com.br' in (await photo.get_attribute('src'))
  assert await page.locator('[data-item-id="photo-fallback-check"] img').count()==0, 'Never display an untrusted image'
  await photo.evaluate("(img) => img.dispatchEvent(new Event('error'))")
  assert await page.locator('[data-item-id="photo-ean-check"] .item-icon span').count()==1, 'Failed image must return to contextual icon'
  await page.locator('[data-action="nav"][data-to="purchase"]').last.click()
  assert await page.locator('[data-item-id="photo-ean-check"] img.item-photo').count()==1, 'Shopping mode must also show photo'
  print('Trusted EAN image in list/purchase and safe fallback: PASS')
  # Changing a barcode changes product identity. The old packshot must
  # disappear or be replaced with the picture from the NEW matching GTIN.
  await page.locator('[data-action="nav"][data-to="list"]').last.click()
  await page.locator('[data-item-id="photo-ean-check"] [data-action="edit-item"]').click()
  await page.locator('form[data-form="item-edit"] input[name="barcode"]').fill('7891910008353')
  await page.locator('form[data-form="item-edit"] input[name="name"]').fill('Açúcar Refinado União 5kg')
  await page.locator('form[data-form="item-edit"] button[type="submit"]').click()
  newer=page.locator('[data-item-id="photo-ean-check"] img.item-photo')
  assert await newer.count()==1, 'New EAN should resolve a matching catalog image'
  assert '7891910008353' in (await newer.get_attribute('src')), 'Must show 5kg packshot, not prior 1kg'
  print('Editing EAN refreshes the product packshot: PASS')
  # A shared item arrives on a second phone with GTIN but no image. Mock only
  # the public catalog edge; let the real browser code perform the HTTP lookup.
  async def openfacts(route):
   await route.fulfill(status=200,content_type='application/json',body=(
    '{"code":"7891234567895","product":{"product_name_pt":"Café para teste",'
    '"image_front_small_url":"https://images.openfoodfacts.org/images/products/789/123/456/7895/front_pt.400.jpg"}}'))
  photo_calls=[]
  async def tracked_openfacts(route):
   photo_calls.append(route.request.url)
   await openfacts(route)
  await page.route('https://world.openfoodfacts.org/api/v3/product/7891234567895.json*',tracked_openfacts)
  await page.route('https://images.openfoodfacts.org/**',lambda route:route.fulfill(
   status=200,content_type='image/svg+xml',
   body='<svg xmlns="http://www.w3.org/2000/svg" width="43" height="43"></svg>'))
  await page.evaluate("""() => window.LumoLegacy.applyRemote(s => {
   s.items.push({id:'shared-photo-check',listId:s.activeListId,barcode:'7891234567895',
    name:'Meu café',details:'',category:'Mercearia',
    qty:1,unit:'un',unitPriceCents:0,status:'pending',createdAt:new Date().toISOString()});
  })""")
  shared=page.locator('[data-item-id="shared-photo-check"] img.item-photo')
  await shared.wait_for(state='attached',timeout=9000)
  assert 'images.openfoodfacts.org' in (await shared.get_attribute('src'))
  assert len(photo_calls)==1,'One GTIN lookup must not repeat on subsequent renders'
  learned=await page.evaluate("""() => {
   const state=window.LumoLegacy.getState();
   const catalog=state.catalog.find(x=>x.barcode==='7891234567895');
   const item=state.items.find(x=>x.id==='shared-photo-check');
   return {name:catalog?.name,source:catalog?.source,localName:item?.name};
  }""")
  assert learned['name']=='Café para teste', 'Trusted public product description must enrich local catalog'
  assert learned['localName']=='Meu café', 'Automatic catalog changes must never overwrite a shopping item'
  assert learned['source'], 'Product provenance should be recorded'
  await page.locator('[data-action="nav"][data-to="purchase"]').last.click()
  await page.wait_for_timeout(200)
  assert len(photo_calls)==1,'Photo lookup result must be reused from the local cache'
  print('Second-device GTIN automatically receives trusted cached photo: PASS')

  # A provider may return data for a different EAN; never show that packshot.
  async def mismatched_openfacts(route):
   await route.fulfill(status=200,content_type='application/json',body=(
    '{"code":"7891234567895","product":{"product_name_pt":"Produto errado",'
    '"image_front_small_url":"https://images.openfoodfacts.org/wrong.jpg"}}'))
  await page.route('https://world.openfoodfacts.org/api/v3/product/7891234567888.json*',mismatched_openfacts)
  for hostname in ['world.openbeautyfacts.org','world.openproductsfacts.org']:
   await page.route(f'https://{hostname}/api/v3/product/7891234567888.json*',
    lambda route:route.fulfill(status=404,body='{}'))
  await page.evaluate("""() => window.LumoLegacy.applyRemote(s => {
   s.items.push({id:'mismatch-photo-check',listId:s.activeListId,barcode:'7891234567888',
    name:'Produto sem foto conferida',details:'',category:'Mercearia',
    qty:1,unit:'un',unitPriceCents:0,status:'pending',createdAt:new Date().toISOString()});
  })""")
  await page.wait_for_timeout(700)
  assert await page.locator('[data-item-id="mismatch-photo-check"] img.item-photo').count()==0, 'Mismatched EAN photo must never display'
  print('Wrong-EAN photo rejected: PASS')



  await page.screenshot(path=str(Path(gettempdir())/'lumo_restored_list_390.png'),full_page=True)
  await page.locator('[data-action="nav"][data-to="purchase"]').last.click()
  await page.wait_for_timeout(150)
  assert await page.locator('body').get_attribute('data-screen')=='purchase'
  await page.locator('[data-action="nav"][data-to="history"]').last.click()
  await page.wait_for_timeout(80)
  assert await page.locator('body').get_attribute('data-screen')=='history'
  await page.locator('[data-action="nav"][data-to="note"]').last.click()
  await page.wait_for_timeout(80)
  assert await page.locator('body').get_attribute('data-screen')=='note'
  assert not errors,errors
  print('Purchase, History and Receipt navigation: PASS')
  await browser.close()
if __name__=='__main__':asyncio.run(main())
