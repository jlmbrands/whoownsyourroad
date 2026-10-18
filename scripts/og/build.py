# Builds every social preview image and app icon from one template.
# Run: python3 scripts/og/build.py   (needs Playwright + Chromium)
#
# Filenames carry a version (VERSION below). Social networks cache previews by
# URL, so when you change an image, bump VERSION and update the og:image tags
# (scripts/seo/apply.py does the tags).

import asyncio, pathlib
from playwright.async_api import async_playwright

VERSION = "v6"
ROOT = pathlib.Path(__file__).resolve().parents[2]
PUB = ROOT / "public"
FONTS = (PUB / "fonts").as_uri()
DOTMATRIX = (PUB / "js" / "dotmatrix.js").as_uri()

CARDS = {
    # name: (headline, kicker, label, readout)
    "home":  ("You paid for this road. They charge $24 to use it.", "Six miles on Loop 820, Fort Worth. The tolls go to investors in Amsterdam and Paris until 2061.", "Fort Worth, rush hour", "$24.00"),
    "roads": ("A company in Amsterdam sets the price on I-35W.", "Three DFW highways, one lead investor, contracts that run until 2061. Here's who, and what Texas paid.", "Who owns your road", "$24.00"),
    "write": ("Your state rep can end this. Tell them in 60 seconds.", "The letter is written. Look up your reps, add your name, hit send.", "Write your reps", "$24.00"),
    "sign":  ("Sign the petition.", "Cap the $24 tolls on DFW express lanes. Lawmakers meet in Austin January 12. Takes 60 seconds.", "Petition to the Texas Legislature", "$24.00"),
    "faq":   ("Why $24? Because the contract allows it.", "Plain answers: who owns DFW's express lanes, how the price is set, and when it ends.", "Questions and answers", "$24.00"),
}

def html(w, h, headline, kicker, label, readout, square=False):
    pad = 64 if not square else 88
    hs = 74 if not square else 100
    ks = 27 if not square else 34
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:O;font-weight:900;src:url("{FONTS}/overpass-latin-900-normal.woff2")}}
@font-face{{font-family:O;font-weight:600;src:url("{FONTS}/overpass-latin-600-normal.woff2")}}
html,body{{margin:0}}
body{{width:{w}px;height:{h}px;background:#141618;color:#fff;font-family:O,Arial,sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:{pad}px;box-sizing:border-box}}
.top{{display:flex;justify-content:space-between;align-items:center}}
.label{{background:#00703c;border:3px solid #fff;box-shadow:0 0 0 3px #00703c;border-radius:6px;padding:8px 18px 4px;font-weight:600;font-size:{ks-4}px}}
.wm{{font-weight:900;font-size:26px}}
.readout{{width:{'100%' if square else '440px'};max-width:{'900px' if square else '440px'};background:#0b0c0d;border:4px solid #3a3e42;border-radius:10px;padding:{'20px 26px' if square else '12px 18px'};box-shadow:inset 0 0 0 3px #000;margin:{'36px auto 0' if square else '18px 0 0'}}}
.readout svg{{width:100%;height:auto;filter:drop-shadow(0 0 7px rgba(255,176,0,.5))}}
h1{{margin:0;font-weight:900;font-size:{hs}px;line-height:.96;letter-spacing:-.025em;max-width:{'100%' if square else '1040px'}}}
p{{margin:12px 0 0;font-size:{ks}px;line-height:1.25;font-weight:600;color:#d6dad7;max-width:{'100%' if square else '1000px'}}}
.lane{{position:absolute;left:0;right:0;bottom:0;height:16px;background:repeating-linear-gradient(90deg,#fff 0 72px,transparent 72px 124px) left center/100% 6px no-repeat}}
</style></head><body>
<div><div class="top"><div class="label">{label}</div><div class="wm">WhoOwnsYourRoad.com</div></div>
<div class="readout" id="r"></div></div>
<div><h1>{headline}</h1><p>{kicker}</p></div>
<div class="lane"></div>
<script src="{DOTMATRIX}"></script><script>document.getElementById("r").innerHTML=dotMatrix("{readout}")</script>
</body></html>"""

ICON = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}body{width:512px;height:512px;background:#00703c;display:grid;place-items:center}
.s{width:400px;height:400px;border:14px solid #fff;border-radius:48px;display:grid;place-items:center;background:#00703c}
.p{width:300px;background:#0b0c0d;border:6px solid #3a3e42;border-radius:16px;padding:22px 24px;box-shadow:inset 0 0 0 4px #000}
svg{width:100%;height:auto;filter:drop-shadow(0 0 8px rgba(255,176,0,.6))}</style></head>
<body><div class="s"><div class="p" id="r"></div></div><script src="__DM__"></script><script>document.getElementById("r").innerHTML=dotMatrix("$24")</script></body></html>""".replace("__DM__", DOTMATRIX)

TMP = pathlib.Path(__file__).resolve().parent / "_tmp.html"

async def render(b, markup, w, h, path, scale=1):
    # Written to disk and opened as file:// so local fonts and scripts load.
    TMP.write_text(markup)
    pg = await b.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
    await pg.goto(TMP.as_uri()); await pg.wait_for_timeout(400)
    await pg.screenshot(path=str(path)); await pg.close()

async def main():
    out = PUB / "img"
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, (headline, kicker, label, readout) in CARDS.items():
            await render(b, html(1200, 630, headline, kicker, label, readout), 1200, 630, out / f"share-{name}-{VERSION}.png")
        # One image per page only. Listing a second (square) og:image made
        # iMessage blend the two into one broken preview.
        # Icons
        for size, fname in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
            await render(b, ICON, 512, 512, out / fname, scale=size / 512)
        await b.close()
    TMP.unlink(missing_ok=True)
    for f in sorted(out.glob("*.png")):
        print(f"{f.name:28s} {f.stat().st_size//1024:4d} KB")

asyncio.run(main())
