# Renders the social preview image from share.html. Run: python3 scripts/og/render.py
import asyncio, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).resolve().parent
out = here.parent.parent / "public" / "img" / "share.png"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":1200,"height":630})
        await pg.goto((here/"share.html").as_uri()); await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(out)); await b.close()
    print("wrote", out)
asyncio.run(main())
