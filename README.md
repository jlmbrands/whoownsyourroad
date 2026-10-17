# Who Owns Your Road

An issue site about who controls the private toll lanes on Texas highways, starting with the TEXpress lanes in Dallas-Fort Worth, with a petition to the 90th Texas Legislature.

## Stack

- Plain HTML, CSS and JavaScript in `public/`
- Node.js + Express server (`server.js`)
- SQLite for petition signatures (`db.js`, stored in `data/signatures.db`)

No build step. Edit a page, refresh the browser.

## Run locally

```bash
npm install
npm run dev        # restarts on file changes
# or
npm start
```

Then open http://localhost:3000.

## Pages

| Path        | File                    |
|-------------|-------------------------|
| `/`         | `public/index.html`     |
| `/roads`    | `public/roads.html`     |
| `/write`    | `public/write.html`     |
| `/sources`  | `public/sources.html`   |
| `/about`    | `public/about.html`     |

Footnote links point to `/sources#sN`. When you add a source, give it the next `id` in `sources.html`.

## Design notes

- The home page is a vertical story told in road signs. Each `section.sign` is one screen; its color class (`yellow`, `green`, `white`, `orange`, `blue`, `asphalt`, `gantry`) follows US sign meanings: yellow warning, green guide, white regulatory, orange work zone, blue services.
- The petition form lives on the home page (`#sign`). `/petition` redirects there.

- Fonts are self-hosted in `public/fonts/` (Overpass, the open cut of Highway Gothic). No Google Fonts, no trackers.
- The LED readouts are real dot matrices drawn by `public/js/dotmatrix.js`. `dotMatrix("$24.00")` returns an SVG string.
- The social preview image is rendered from `scripts/og/share.html`. After changing it: `python3 scripts/og/render.py` (needs Playwright) and commit `public/img/share.png`.
- Share texts and the session countdown live in `public/js/site.js`. The rep letter lives in `public/js/write.js`.

## Petition API

- `GET /api/petition/count` returns `{ total, texas }`
- `POST /api/petition` with JSON `{ first_name, last_name, email, zip, comment?, wants_updates? }`
  - `201` signed, `400` validation errors, `409` email already signed, `429` rate limited
  - Signatures with a Texas ZIP are flagged `is_texas`

Export signatures to CSV:

```bash
npm run export > signatures.csv
```

## Moving to Postgres later

Everything database-related lives in `db.js`, which exports `addSignature`, `getCounts` and `allSignatures`. Replace that file with a Postgres version using the same function names (made async, with `await` added in `server.js`) and nothing else needs to change.

## Environment

| Variable   | Default    | Purpose                       |
|------------|------------|-------------------------------|
| `PORT`     | `3000`     | Server port                   |
| `DATA_DIR` | `./data`   | Where the SQLite file is kept |

## Deploy on Railway

1. railway.com → New Project → Deploy from GitHub repo → `jlmbrands/whoownsyourroad`. Railway detects Node and runs `npm start`.
2. On the service, add a **Volume** mounted at `/data`.
3. Under Variables, set `DATA_DIR=/data` so signatures land on the volume and survive redeploys.
4. Under Settings → Networking, add the custom domain `whoownsyourroad.com` (and `www`), then create the DNS records Railway shows you at your registrar.
5. Optional: set the health check path to `/healthz`.

Every push to `main` redeploys automatically.

## Before launch

- Set up the `hello@` contact address used on the About page
- Re-check ownership shares and figures against the latest filings
- Put the site behind HTTPS (the rate limiter trusts one proxy hop)
- Optional: a ZIP-to-legislator lookup (Open States or Cicero APIs, paid above a free tier) would let the write page address the email automatically
