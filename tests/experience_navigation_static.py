"""Run original MVP interactions in Chromium about:blank for visual/navigation parity.
This intentionally avoids any live browser API, server, camera or OAuth claim.
"""
import asyncio
from pathlib import Path
from tempfile import gettempdir
from playwright.async_api import async_playwright
HTML=(Path(__file__).resolve().parents[1]/'web/index.html').read_text()
HTML=HTML.replace('<script type="module" src="./experience-auth.mjs"></script>','').replace('<link rel="stylesheet" href="./experience.css">','')
HTML=HTML.replace('<body>','<body><style>body #lumo-identity-gate{display:none}body #app{visibility:visible}</style>',1)

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
  await page.locator('[data-action="nav"][data-to="purchase"]').last.click()
  assert await page.locator('[data-item-id="photo-ean-check"] img.item-photo').count()==1, 'Shopping mode must also show photo'
  print('Trusted EAN image in list/purchase and safe fallback: PASS')

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
