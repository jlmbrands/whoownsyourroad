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
| `/petition` | `public/petition.html`  |
| `/sources`  | `public/sources.html`   |
| `/about`    | `public/about.html`     |

Footnote links point to `/sources#sN`. When you add a source, give it the next `id` in `sources.html`.

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

## Before launch

- Set up the `hello@` contact address used on the About page
- Re-check ownership shares and figures against the latest filings
- Put the site behind HTTPS (the rate limiter trusts one proxy hop)
