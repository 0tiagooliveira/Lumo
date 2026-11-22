"""Playwright smoke of native HTML controls (no live network or JS module execution).
To validate the real OAuth redirect, run the full app at a browser-accessible HTTPS origin.
"""
import asyncio
from pathlib import Path
from shutil import which
from os import environ
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parents[1] / 'web'

async def main():
 html=(BASE/'beta.html').read_text(encoding='utf-8')
 css=(BASE/'style.css').read_text(encoding='utf-8')
 html=html.replace('<link rel="manifest" href="./manifest.webmanifest"><link rel="stylesheet" href="./style.css">','<style>'+css+'</style>')
 async with async_playwright() as pw:
  browser_path=which('chromium') or which('chromium-browser')
  opts={'executable_path':browser_path} if browser_path else {}
  browser=await pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'],**opts)
  page=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
  await page.set_content(html,wait_until='domcontentloaded')
  assert await page.get_by_role('button',name='Continuar com sua Conta Google').is_visible()
  assert await page.locator('#alternateLogin').evaluate('(node)=>node.open') is False
  await page.get_by_text('Já tenho acesso por e-mail e senha').click()
  assert await page.locator('#alternateLogin').evaluate('(node)=>node.open') is True
  assert await page.get_by_role('button',name='Entrar com e-mail').is_visible()
  if environ.get('LUMO_SCREENSHOT'):
   await page.screenshot(path=environ['LUMO_SCREENSHOT'],full_page=True)
  await browser.close()
  print('PASSOU: controles HTML mobile Google principal e login e-mail secundário. NÃO executa OAuth real.')

if __name__=='__main__':asyncio.run(main())
