# Who Owns Your Road

Issue site at https://whoownsyourroad.com about private control of DFW toll lanes (TEXpress: NTE, NTE 35W, LBJ), with a petition to the Texas Legislature. Owner: Joseph (JLM Brands). Full technical details are in README.md.

## How it's built
- Plain HTML/CSS/JS in `public/`, Express server in `server.js`, SQLite petition storage in `db.js`. No build step, no framework.
- Run locally: `npm install && npm run dev`, then http://localhost:3000.
- Deploys: push to `main` on GitHub (jlmbrands/whoownsyourroad) and Railway redeploys automatically in about a minute. Signatures live on a Railway volume at `/data` (`DATA_DIR=/data`).
- DNS, the www redirect and hello@ email forwarding are in Cloudflare.

## Rules for every change
- **Cache busting:** after any change to `public/css/site.css` or any file in `public/js/`, bump the `?v=` value on every `<link>` and `<script>` tag in `public/*.html` (one find-and-replace). Otherwise phones keep the old file and the site looks broken.
- **Copy:** the home page is a vertical story of road signs, one idea per screen. Each screen is a short headline plus at most one short line. Readable by anyone aged 12 to 99. No jargon. Tone is provocative but every claim must be true.
- **Sources:** every number on the site links to `/sources#sN`. New facts need a new numbered entry in `public/sources.html`. Don't publish a figure without a source.
- **Sign colors mean something** (US road signs): yellow = warning, green = guide/action, white = rules, orange = work zone (the Legislature), blue = services/sharing, asphalt/gantry = the toll itself.
- **Share previews:** images are built by `python3 scripts/og/build.py`; tags are written by `python3 scripts/seo/apply.py`. If a share image changes, bump `VERSION`/`IMG_VERSION` in both scripts so social apps fetch the new one.
- Check mobile first (390px wide). Most visitors come from a phone via social media.
- Don't commit `data/` (local signatures).

## Open items
- Railway account is on Trial; upgrade to Hobby before launch.
- Get permission from the four Facebook posters whose photos and receipts are cited as sources 23 and 24.
