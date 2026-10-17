# Writes the SEO and social-preview tags into every page's <head>.
# Run after changing titles, descriptions or share images:
#   python3 scripts/seo/apply.py
# It replaces everything between <!-- seo:start --> and <!-- seo:end -->, adding
# the markers the first time. Page-specific <title> and <meta name="description">
# are set from PAGES below so they stay in one place.

import json, pathlib, re, html

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUB = ROOT / "public"
SITE = "https://whoownsyourroad.com"
IMG_VERSION = "v5"
SITE_NAME = "Who Owns Your Road"

PAGES = {
    "index.html": dict(
        path="/",
        title="You paid for this road. They charge $24 to use it. | Who Owns Your Road",
        description="DFW express lane tolls have hit $24 for six miles. The highways are Texas-owned. The tolls go to private investors until 2061. See who, and tell the Legislature to act.",
        og_title="You paid for this road. They charge $24 to use it.",
        og_description="Six miles on Loop 820. The tolls go to investors in Amsterdam and Paris until 2061. 60 seconds to tell the Legislature it's over.",
        image="home",
        type="website",
    ),
    "sign.html": dict(
        path="/sign",
        title="Sign the petition: cap DFW express lane tolls | Who Owns Your Road",
        description="Tell the Texas Legislature to cap surge tolls on private express lanes, open the books and vote before any new deal. Takes 60 seconds. Delivered January 12.",
        og_title="Add your name. Austin hears it January 12.",
        og_description="$24 for six miles, on roads our taxes built. Tell the Legislature to cap it. 60 seconds.",
        image="sign",
        type="website",
    ),
    "roads.html": dict(
        path="/roads",
        title="Who owns the TEXpress lanes? NTE, NTE 35W and LBJ, explained | Who Owns Your Road",
        description="Ownership shares, what Texas paid, contract end dates and how the toll is set on the I-820, SH 121/183, I-35W and LBJ express lanes in Dallas-Fort Worth.",
        og_title="A company in Amsterdam sets the price on I-35W.",
        og_description="Three DFW highways, one lead investor, contracts until 2061. Here's who, and what Texas paid.",
        image="roads",
        type="article",
    ),
    "write.html": dict(
        path="/write",
        title="Email your Texas state rep and senator about $24 tolls | Who Owns Your Road",
        description="The letter is written. Look up your Texas legislators, add your name, and send it in 60 seconds. Ask them to cap surge tolls on private express lanes.",
        og_title="Your state rep can end this. Tell them in 60 seconds.",
        og_description="The letter is written. Look up your reps, add your name, hit send.",
        image="write",
        type="website",
    ),
    "faq.html": dict(
        path="/faq",
        title="Why is the toll $24? DFW express lane questions answered | Who Owns Your Road",
        description="Who owns the TEXpress lanes on I-35W, 820, 183 and LBJ? Why do tolls hit $20 and $24? When do the contracts end? Plain answers with sources.",
        og_title="Why $24? Because the contract allows it.",
        og_description="Plain answers: who owns DFW's express lanes, how the price is set, and when it ends.",
        image="faq",
        type="article",
    ),
    "sources.html": dict(
        path="/sources",
        title="Sources | Who Owns Your Road",
        description="Every figure on Who Owns Your Road, with a link to the government record, company filing or news report it came from.",
        og_title="Every number on Who Owns Your Road, with its source.",
        og_description="Government records, company filings and news reports behind the $24 toll story.",
        image="home",
        type="website",
    ),
    "about.html": dict(
        path="/about",
        title="About | Who Owns Your Road",
        description="Who runs Who Owns Your Road, how facts are checked, and how petition data is handled.",
        og_title="About Who Owns Your Road",
        og_description="An independent look at who controls Texas toll lanes, and how we check the facts.",
        image="home",
        type="website",
    ),
}

FAQ_LD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "Why is the toll on I-35W, 820 or 183 so high?",
         "acceptedAnswer": {"@type": "Answer", "text": "Because the contract allows it. The price on these express lanes changes every five minutes to keep the toll lane moving at about 50 mph. The normal cap is about $1.06 a mile, but the contract lets the operator go past that cap when traffic is heavy. On busy afternoons that produces posted prices of $20 and $24 for a single trip."}},
        {"@type": "Question", "name": "Who owns the TEXpress lanes in Dallas-Fort Worth?",
         "acceptedAnswer": {"@type": "Answer", "text": "Texas owns the highways, but the express lanes on I-820, SH 121/183, I-35W, I-635 and I-35E are run by private companies under long contracts with TxDOT. The lead investor in all three is Cintra, the toll-road arm of Ferrovial, headquartered in Amsterdam. Other investors are Meridiam (France), APG (Netherlands) and, on LBJ, the Dallas Police and Fire Pension System."}},
        {"@type": "Question", "name": "Where does the toll money go?",
         "acceptedAnswer": {"@type": "Answer", "text": "To the private company that runs each road. It uses the tolls to repay the loans and bonds that built the lanes, to run and maintain the road, and to pay returns to its investors. Texas gets a share only after revenue passes set levels."}},
        {"@type": "Question", "name": "When do the toll contracts end?",
         "acceptedAnswer": {"@type": "Answer", "text": "2061. The NTE and LBJ contracts were signed in 2009 and run about 52 years. The NTE 35W contract runs to the same year. When they end, the roads come back to TxDOT."}},
        {"@type": "Question", "name": "Did taxpayers pay for these roads too?",
         "acceptedAnswer": {"@type": "Answer", "text": "Yes. About $1.2 billion in state and regional money went into the three deals, on top of federal loans that the tolls repay. One stretch of I-35W was built entirely by TxDOT, and the private company collects the tolls on it anyway."}},
        {"@type": "Question", "name": "Can I avoid the toll?",
         "acceptedAnswer": {"@type": "Answer", "text": "Yes. The regular lanes next to the express lanes are free. The express lanes are a choice, and the price is meant to limit how many people choose them."}},
        {"@type": "Question", "name": "Is this legal?",
         "acceptedAnswer": {"@type": "Answer", "text": "Yes. The Legislature authorized these contracts in the 2000s, and TxDOT signed them. That is also why the Legislature can change the rules."}},
        {"@type": "Question", "name": "What can actually be done?",
         "acceptedAnswer": {"@type": "Answer", "text": "Cap surge tolls in state law, require the companies to publish their books, have TxDOT price what it would cost to end the contracts early, and require a vote before any new private toll deal. The 90th Texas Legislature convenes January 12, 2027."}},
    ],
}

ORG_LD = {
    "@context": "https://schema.org",
    "@graph": [
        {"@type": "Organization", "@id": SITE + "/#org", "name": SITE_NAME, "url": SITE + "/",
         "logo": SITE + "/img/icon-512.png", "email": "hello@whoownsyourroad.com",
         "description": "An independent project on who controls Texas toll lanes, starting with the DFW express lanes."},
        {"@type": "WebSite", "@id": SITE + "/#site", "name": SITE_NAME, "url": SITE + "/", "publisher": {"@id": SITE + "/#org"}, "inLanguage": "en-US"},
    ],
}

def block(name, cfg):
    img = f"{SITE}/img/share-{cfg['image']}-{IMG_VERSION}.png"
    url = SITE + cfg["path"]
    e = html.escape
    lines = [
        "<!-- seo:start -->",
        f'<title>{e(cfg["title"])}</title>',
        f'<meta name="description" content="{e(cfg["description"])}">',
        f'<link rel="canonical" href="{url}">',
        '<meta name="robots" content="index, follow, max-image-preview:large">',
        '<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">',
        '<link rel="icon" href="/img/icon-192.png" type="image/png" sizes="192x192">',
        '<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        '<link rel="preload" href="/fonts/overpass-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="/fonts/overpass-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>',
        f'<meta property="og:type" content="{cfg["type"]}">',
        f'<meta property="og:site_name" content="{SITE_NAME}">',
        '<meta property="og:locale" content="en_US">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{e(cfg["og_title"])}">',
        f'<meta property="og:description" content="{e(cfg["og_description"])}">',
        f'<meta property="og:image" content="{img}">',
        '<meta property="og:image:secure_url" content="%s">' % img,
        '<meta property="og:image:type" content="image/png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{e(cfg["og_title"])}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(cfg["og_title"])}">',
        f'<meta name="twitter:description" content="{e(cfg["og_description"])}">',
        f'<meta name="twitter:image" content="{img}">',
        f'<meta name="twitter:image:alt" content="{e(cfg["og_title"])}">',
        f'<script type="application/ld+json">{json.dumps(ORG_LD, separators=(",", ":"))}</script>',
    ]
    if name == "faq.html":
        lines.append(f'<script type="application/ld+json">{json.dumps(FAQ_LD, separators=(",", ":"))}</script>')
    lines.append("<!-- seo:end -->")
    return "\n  ".join(lines)

def strip_old(head):
    # Remove tags the block now owns, wherever they are in the head.
    patterns = [
        r"\s*<title>.*?</title>",
        r'\s*<meta name="description"[^>]*>',
        r'\s*<link rel="canonical"[^>]*>',
        r'\s*<link rel="icon"[^>]*>',
        r'\s*<meta property="og:[^"]*"[^>]*>',
        r'\s*<meta name="twitter:[^"]*"[^>]*>',
    ]
    for p in patterns:
        head = re.sub(p, "", head, flags=re.S)
    return head

for name, cfg in PAGES.items():
    f = PUB / name
    s = f.read_text()
    head_start = s.index("<head>") + len("<head>")
    head_end = s.index("</head>")
    head = s[head_start:head_end]
    head = re.sub(r"\s*<!-- seo:start -->.*?<!-- seo:end -->", "", head, flags=re.S)
    head = strip_old(head)
    head = head.rstrip() + "\n  " + block(name, cfg) + "\n"
    s = s[:head_start] + head + s[head_end:]
    f.write_text(s)
    print("ok", name)

# robots.txt and sitemap.xml
(PUB / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: {SITE}/sitemap.xml\n")
urls = "".join(f"  <url><loc>{SITE}{c['path']}</loc><changefreq>weekly</changefreq><priority>{'1.0' if c['path']=='/' else '0.7'}</priority></url>\n" for c in PAGES.values())
(PUB / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
(PUB / "site.webmanifest").write_text(json.dumps({
    "name": SITE_NAME, "short_name": "Your Road", "start_url": "/", "display": "browser",
    "background_color": "#141618", "theme_color": "#00703c",
    "icons": [{"src": "/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "/img/icon-512.png", "sizes": "512x512", "type": "image/png"}],
}, indent=2))
print("ok robots.txt sitemap.xml site.webmanifest")
