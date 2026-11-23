"""Static Chromium rendering of the ORIGINAL v1.7 UI; authentication/network are bypassed.
This is NOT an OAuth or Supabase integration test."""
import asyncio, pathlib, re
from playwright.async_api import async_playwright
HTML=pathlib.Path(__file__).resolve().parents[1]/'web'/'index.html'
async def main():
 async with async_playwright() as play:
  browser=await play.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in (360,390,430):
   page=await browser.new_page(viewport={'width':width,'height':844},device_scale_factor=1)
   errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
   html=HTML.read_text()
   # Rendering-only path: inline original HTML + script, no external modules/auth/network.
   html=html.replace('<script type="module" src="./experience-auth.mjs"></script>','')
   html=html.replace('<link rel="stylesheet" href="./experience.css">','')
   html=html.replace('<body>','<body><style>body #lumo-identity-gate{display:none}body #app{visibility:visible}</style>',1)
   await page.set_content(html,wait_until='domcontentloaded')
   await page.evaluate("() => {window.__lumoUserId='test-user-visual'; window.dispatchEvent(new Event('lumo:auth-ready'));}")
   await page.wait_for_timeout(350)
   print('width',width,'title',await page.title(),'onboarding',await page.locator('h1').count(),'mascots',await page.locator('.mascot-svg').count(),'errors',errs[:3])
   assert not errs,errs
   assert await page.locator('.mascot-svg').count()>0
   await page.screenshot(path=f'/mnt/data/lumo_original_ux_{width}.png',full_page=True)
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
