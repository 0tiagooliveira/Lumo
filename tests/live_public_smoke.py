"""Post-deploy browser verification on the public Firebase domain.
Uses fresh, unsigned browser profiles only. Never logs in, reads personal data,
creates products or modifies the Supabase project.
Run only after the Firebase Hosting release command reports success.
"""
import asyncio
import os
from playwright.async_api import async_playwright

URL='https://uselumo.web.app/'
EXPECTED_SHA=os.environ.get('GITHUB_SHA')

async def main():
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(
            headless=True, args=['--no-sandbox'])
        # Check the exact published commit, not merely a 200 from a stale CDN.
        if EXPECTED_SHA:
            async with playwright.request.new_context() as client:
                result=await client.get(URL+'release.json', timeout=20000)
                assert result.status==200, f'release manifest HTTP {result.status}'
                manifest=await result.json()
                assert manifest.get('commit')==EXPECTED_SHA, 'Firebase release SHA mismatch'
                assert manifest.get('site')=='uselumo', 'Wrong Firebase Hosting site'
        for label,width,height in [('mobile',390,844),('tablet',1024,768)]:
            context=await browser.new_context(
                viewport={'width':width,'height':height},
                java_script_enabled=True, locale='pt-BR')
            page=await context.new_page()
            errors=[]
            page.on('pageerror',lambda exc: errors.append(str(exc)))
            response=await page.goto(URL,wait_until='domcontentloaded',timeout=30000)
            assert response and response.status==200, f'{label}: failed to load Firebase'
            await page.locator('#lumo-login-google').wait_for(state='visible',timeout=20000)
            assert await page.locator('#lumo-identity-gate').is_visible(), f'{label}: login gate invisible'
            assert not await page.locator('#lumo-cloud-dock').is_visible(), f'{label}: private controls visible pre-login'
            assert 'Google' in (await page.locator('#lumo-login-google').inner_text())
            assert not errors, f'{label}: JavaScript errors {errors}'
            print(f'{label}: public HTML and unauthenticated Google gate PASS')
            await context.close()
        await browser.close()

if __name__=='__main__':
    asyncio.run(main())
