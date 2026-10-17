// Who Owns Your Road: static pages plus a small petition API.

const path = require("path");
const express = require("express");
const { addSignature, getCounts } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));

// Basic security headers. Fonts come from Google Fonts; everything else is local.
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; " +
      "script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  });
  next();
});

app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
    maxAge: "1h",
  })
);

// ---------- Petition API ----------

// Simple per-IP limiter: 5 submissions per 10 minutes.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length) hits.set(ip, recent);
    else hits.delete(ip);
  }
}, WINDOW_MS).unref();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP_RE = /^\d{5}$/;

// Texas ZIP codes run 75000-79999, plus 88510-88595 (El Paso PO boxes).
function isTexasZip(zip) {
  const n = Number(zip);
  return (n >= 75000 && n <= 79999) || (n >= 88510 && n <= 88595);
}

function clean(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

app.get("/healthz", (req, res) => res.type("text").send("ok"));

app.get("/api/petition/count", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getCounts());
});

app.post("/api/petition", (req, res) => {
  const body = req.body || {};

  // Honeypot: real people never see or fill this field.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  if (rateLimited(req.ip)) {
    return res
      .status(429)
      .json({ ok: false, error: "Too many signatures from this connection. Try again in a few minutes." });
  }

  const sig = {
    first_name: clean(body.first_name, 60),
    last_name: clean(body.last_name, 60),
    email: clean(body.email, 254).toLowerCase(),
    zip: clean(body.zip, 5),
    comment: clean(body.comment, 500) || null,
    wants_updates: body.wants_updates ? 1 : 0,
  };

  const errors = {};
  if (!sig.first_name) errors.first_name = "Enter your first name.";
  if (!sig.last_name) errors.last_name = "Enter your last name.";
  if (!EMAIL_RE.test(sig.email)) errors.email = "Enter an email address like name@example.com.";
  if (!ZIP_RE.test(sig.zip)) errors.zip = "Enter a 5-digit ZIP code.";

  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, errors });
  }

  sig.is_texas = isTexasZip(sig.zip) ? 1 : 0;

  const result = addSignature(sig);
  if (result.duplicate) {
    return res.status(409).json({
      ok: false,
      duplicate: true,
      error: "This email has already signed. Thank you.",
    });
  }

  res.status(201).json({ ok: true, is_texas: !!sig.is_texas, counts: getCounts() });
});

// ---------- Fallbacks ----------

app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "Not found" }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ ok: false, error: "Something failed on our end. Try again shortly." });
  }
  res.status(500).send("Server error");
});

app.listen(PORT, () => {
  console.log(`Who Owns Your Road running at http://localhost:${PORT}`);
});
