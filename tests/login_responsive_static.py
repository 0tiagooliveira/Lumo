"""Responsive and accessible Lumo entry regression in actual Chromium.
The Google click is NOT executed; OAuth must only run with a real user.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'web/index.html').read_text()
css=(ROOT/'web/experience.css').read_text()
# Test EXACTLY the deployed HTML without injecting a stylesheet: the previous
# test concealed the missing CSS that caused an oversized SVG in production.
assert '<style id="lumo-entry-critical">\\n'.replace('\\n','\n')+css.strip()+'\n</style>' in html, 'Critical entry CSS must be inlined and match source'
assert '<link rel="stylesheet" href="./experience.css">' not in html, 'Login cannot depend on external CSS'
html=html.replace('<script type="module" src="./experience-auth.mjs"></script>','')
# The gate would be hidden by the auth module after sign-in; this fixture is pre-login.
html=html.replace('id="lumo-login-google" class="lumo-google-login" hidden',
                  'id="lumo-login-google" class="lumo-google-login"')

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for name,width,height in [('S23',360,780),('S25_FE',412,915),('Tab_A11_portrait',800,1180),('Tab_A11_960',960,1280),
                             ('Tab_A11_landscape',1180,800)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   await page.set_content(html,wait_until='domcontentloaded')
   gate=page.locator('#lumo-identity-gate')
   assert await gate.is_visible(), f'{name}: gate hidden'
   assert await page.locator('#lumo-gate-title').is_visible(),f'{name}: introduction invisible'
   assert await page.locator('.lumo-gate-illustration').count()==1,f'{name}: mascot illustration missing'
   bg=await page.locator('.lumo-gate-story').evaluate('el=>getComputedStyle(el).backgroundColor')
   assert bg=='rgb(30, 42, 64)',f'{name}: critical CSS did not apply (story bg={bg})'
   benefit=await page.locator('.lumo-gate-benefits svg').first.bounding_box()
   assert benefit and benefit['width']<=25 and benefit['height']<=25, f'{name}: oversized unstyled icon'
   art=await page.locator('.lumo-gate-illustration').bounding_box()
   assert art and art['width']<=width*.85, f'{name}: illustration overflows screen'
   card_bg=await page.locator('.lumo-gate-card').evaluate('el=>getComputedStyle(el).backgroundColor')
   assert card_bg=='rgb(255, 255, 255)', f'{name}: login panel CSS absent'
   cta=page.locator('#lumo-login-google')
   assert await cta.is_visible(),f'{name}: Google sign-in not visible'
   assert await cta.is_enabled(),f'{name}: button unexpectedly disabled'
   assert await page.locator('#lumo-gate-message[role="status"]').count()==1
   assert await page.locator('h1').count()>=1
   assert await page.locator('.lumo-gate-privacy').is_visible()
   overflow=await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
   assert not overflow,f'{name}: horizontal overflow'
   button=await cta.bounding_box()
   assert button['height']>=50,f'{name}: touch target too short'
   if name in ('S23','S25_FE'):
    assert button['y']+button['height']<=height+15,f'{name}: CTA must be immediately reachable'
   if name.startswith('Tab_A11'):
    columns=await page.locator('.lumo-gate-shell').evaluate(
     'el=>getComputedStyle(el).gridTemplateColumns.split(" ").length')
    assert columns==2,f'{name}: tablet should show two balanced columns'
   assert not errors,f'{name}: script errors {errors}'
   if name=='S23':
    await page.screenshot(path='/tmp/lumo_login_s23.png')
   if name=='Tab_A11_landscape':
    await page.screenshot(path='/tmp/lumo_login_tablet.png')
   print(name,'PASS')
   await page.close()
  await browser.close()

if __name__=='__main__':asyncio.run(main())
