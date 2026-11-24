from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
css = (ROOT / "web" / "experience.css").read_text(encoding="utf-8")

start = index.index('<div id="lumo-identity-gate"')
end = index.index('<span id="lumo-cloud-status"', start)
login_markup = index[start:end]
document = '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>' + login_markup + '</body></html>'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    for width, height in [(320, 640), (360, 740), (390, 844), (768, 1024), (800, 1280), (1280, 800), (1440, 900), (800, 360)]:
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        page.set_content(document, wait_until="domcontentloaded")
        page.eval_on_selector("#lumo-login-google", "(button) => { button.hidden = false }")
        metrics = page.evaluate("""() => {
            const card = document.querySelector('.lumo-gate-card').getBoundingClientRect();
            const heading = document.querySelector('.lumo-gate h1').getBoundingClientRect();
            const button = document.querySelector('#lumo-login-google').getBoundingClientRect();
            return {
                viewport: innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                cardLeft: card.left, cardRight: card.right,
                headingLeft: heading.left, headingRight: heading.right,
                buttonLeft: button.left, buttonRight: button.right,
                buttonHeight: button.height,
            };
        }""")
        assert metrics["scrollWidth"] <= width + 1, f"Horizontal scroll at {width}x{height}: {metrics}"
        for elem in ("card", "heading", "button"):
            assert metrics[f"{elem}Left"] >= -1, f"{elem} clipped left: {width}x{height}: {metrics}"
            assert metrics[f"{elem}Right"] <= width + 1, f"{elem} clipped right: {width}x{height}: {metrics}"
        assert metrics["buttonHeight"] >= 44, f"Google CTA too short: {width}x{height}"
        page.close()
    browser.close()
print("Login responsive smoke passed on 8 viewports.")
