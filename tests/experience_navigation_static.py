"""Run original MVP interactions in Chromium about:blank for visual/navigation parity.
This intentionally avoids any live browser API, server, camera or OAuth claim.
"""
import asyncio
from pathlib import Path
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
  await page.screenshot(path='/mnt/data/lumo_restored_list_390.png',full_page=True)
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
