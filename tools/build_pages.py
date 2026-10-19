"""Build the ViralX inner pages.

Each fragment in tools/pages/ (e.g. pricing.html, blog/first-second.html) is wrapped in the shared
<head>, header and footer and written to <route>/index.html, so every page is plain static HTML
(crawlable without JS) and works on Vercel and the local server alike. The same header and footer
are also stamped into the homepage between the <!-- @header --> / <!-- @footer --> markers.

Fragment front matter (an HTML comment on the first lines):
    <!--
    title: Pricing — ViralX
    description: One line for search and share previews.
    nav: pricing            (which header link is active; optional)
    scripts: /js/pricing.js (extra module scripts, comma separated; optional)
    image: /assets/...      (share image; optional)
    -->

Run:  python tools/build_pages.py
"""
import html
import json
import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "pages")
SITE = json.load(open(os.path.join(ROOT, "tools", "site.json"), encoding="utf-8"))
DOMAIN = SITE["domain"]

NAV = [
    ("launchos", "LaunchOS", "/#engine"),
    ("discover", "Discover", "/discover/"),
    ("explore", "Explore", "/explore/"),
    ("pricing", "Pricing", "/pricing/"),
    ("blog", "Blog", "/blog/"),
    ("contact", "Contact", "/contact/"),
]

ICONS = {
    "instagram": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1C2.6 9.9 2.6 10.2 2.6 12s0 2.1.1 3.3c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 8.1a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zm6.2-8.3a1.1 1.1 0 11-2.3 0 1.1 1.1 0 012.3 0z"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
    "x": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.3 5.5-6.3zm-1.2 17.9h1.9L7 4.2H5l12 16z"/></svg>',
    "youtube": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>',
}
SOCIAL_LABEL = {"instagram": "Instagram", "linkedin": "LinkedIn", "x": "X", "youtube": "YouTube"}


def header(active=""):
    on = ' class="on" aria-current="page"'
    links = "\n      ".join(
        f'<a href="{href}"{on if key == active else ""}>{label}</a>'
        for key, label, href in NAV
    )
    mobile = "\n    ".join(f'<a href="{href}">{label}</a>' for _, label, href in NAV)
    return f"""<header class="nav" id="nav">
    <a class="brand" href="/" aria-label="ViralX home"><span class="vx" aria-hidden="true"></span><span>ViralX</span></a>
    <nav class="nav-links" aria-label="Main">
      {links}
    </nav>
    <div class="nav-cta" data-auth-slot>
      <a class="nav-login" href="/login/" data-guest>Log in</a>
      <a class="btn btn-primary btn-sm magnetic" href="/signup/" data-guest>Get started</a>
      <a class="btn btn-ghost btn-sm" href="/dashboard/" data-user hidden>Dashboard</a>
      <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" data-menu-btn><i></i><i></i><i></i></button>
    </div>
  </header>
  <div class="mobile-menu" id="mobileMenu" aria-label="Menu">
    {mobile}
    <a href="/about/">About</a>
    <div class="mm-cta"><a class="btn btn-ghost" href="/login/">Log in</a><a class="btn btn-primary" href="/signup/">Get started</a></div>
  </div>"""


def footer():
    s = SITE
    socials = "".join(
        f'<a href="{url}" target="_blank" rel="noopener" aria-label="ViralX on {SOCIAL_LABEL[k]}">{ICONS[k]}</a>'
        for k, url in s["socials"].items() if url
    )
    gst = f' · GSTIN {html.escape(s["gstin"])}' if s.get("gstin") else ""
    return f"""<footer class="footer">
    <div class="foot-cols v2">
      <div>
        <a class="brand" href="/"><span class="vx" aria-hidden="true"></span><span>ViralX</span></a>
        <p class="muted">The AI launch studio for product launch videos — cinematic films, 3D renders, reels and ad cuts in every format.</p>
        <div class="foot-news">
          <form data-newsletter novalidate>
            <label class="sr-only" for="newsEmail">Email address</label>
            <input id="newsEmail" name="email" type="email" placeholder="Your email" autocomplete="email" required />
            <button class="btn btn-primary" type="submit">Subscribe</button>
          </form>
          <small>Launch breakdowns, once a month. No spam — see our <a class="link" href="/privacy/">Privacy Policy</a>.</small>
          <div class="form-msg" role="status"></div>
        </div>
      </div>
      <div><h4>Product</h4><a href="/#engine">LaunchOS</a><a href="/discover/">Discover</a><a href="/explore/">Explore formats</a><a href="/pricing/">Pricing</a><a href="/dashboard/">Client portal</a></div>
      <div><h4>Services</h4><a href="/#services">Launch films</a><a href="/#services">AI video</a><a href="/#services">3D renders</a><a href="/#services">Reels &amp; Shorts</a><a href="/#services">Ad creatives</a></div>
      <div><h4>Company</h4><a href="/about/">About us</a><a href="/blog/">Blog</a><a href="/contact/">Contact</a><a class="claude-link" href="/built-with-claude/">Built with Claude</a></div>
      <div><h4>Legal</h4><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Service</a><a href="/refund-policy/">Refund &amp; Cancellation</a><a href="/data-deletion/">Data deletion</a></div>
    </div>
    <div class="wordmark" aria-hidden="true">ViralX</div>
    <div class="foot-bottom">
      <span>© {date.today().year} {html.escape(s["legal_name"])} · {html.escape(s["city"])}{gst} · <a href="mailto:{s["email"]}">{s["email"]}</a></span>
      <div class="socials">{socials}</div>
    </div>
  </footer>"""


HEAD = """<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="theme-color" content="#07050a" />
  <meta name="color-scheme" content="dark" />
  <link rel="canonical" href="{url}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:site_name" content="ViralX" />
  <meta property="og:url" content="{url}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="{image}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/pages.css" />
  <script>document.documentElement.classList.remove('no-js')</script>
{extra_head}</head>
<body class="page{body_class}">
  <div class="nebula" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
  <div class="grain" aria-hidden="true"></div>
  {header}
  <main id="top">
{body}
  </main>
  {footer}
  <script type="module" src="/js/page.js"></script>
{scripts}</body>
</html>
"""


def parse(path):
    raw = open(path, encoding="utf-8").read()
    meta = {}
    m = re.match(r"\s*<!--(.*?)-->\s*", raw, re.S)
    if m:
        for line in m.group(1).strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        raw = raw[m.end():]
    return meta, raw


def subst(text):
    """Replace {{site.key}} tokens with tools/site.json values."""
    def rep(m):
        val = SITE
        for part in m.group(1).split("."):
            val = val.get(part, "") if isinstance(val, dict) else ""
        return html.escape(str(val))
    return re.sub(r"\{\{site\.([a-z_.]+)\}\}", rep, text)


def build():
    routes = []
    for dirpath, _, files in os.walk(SRC):
        for f in sorted(files):
            if not f.endswith(".html"):
                continue
            src = os.path.join(dirpath, f)
            rel = os.path.relpath(src, SRC).replace("\\", "/")[:-5]  # e.g. blog/first-second
            meta, body = parse(src)
            if rel == "404":
                out, route = os.path.join(ROOT, "404.html"), None
            else:
                route = "/" + (rel[:-6] if rel.endswith("/index") else rel) + "/"
                route = route.replace("//", "/")
                out = os.path.join(ROOT, route.strip("/"), "index.html")
            url = DOMAIN + (route or "/404")
            scripts = "".join(
                f'  <script type="module" src="{s.strip()}"></script>\n'
                for s in meta.get("scripts", "").split(",") if s.strip()
            )
            page = HEAD.format(
                title=html.escape(meta.get("title", "ViralX")),
                description=html.escape(meta.get("description", "")),
                url=url,
                og_type=meta.get("og_type", "website"),
                image=DOMAIN + meta.get("image", "/og-image.png"),
                extra_head=("  " + meta["head"] + "\n") if meta.get("head") else "",
                body_class=(" " + meta["body_class"]) if meta.get("body_class") else "",
                header=header(meta.get("nav", "")),
                body=subst(body.rstrip()),
                footer=footer(),
                scripts=scripts,
            )
            if meta.get("noindex"):
                page = page.replace('<meta name="theme-color"', '<meta name="robots" content="noindex" />\n  <meta name="theme-color"', 1)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, "w", encoding="utf-8", newline="\n").write(page)
            if route and not meta.get("noindex"):
                routes.append(route)
            print("built", out.replace(ROOT, "").replace("\\", "/"))
    stamp_home()
    write_sitemap(routes)


def stamp_home():
    """Swap the homepage header and footer for the shared ones (between @header/@footer markers)."""
    p = os.path.join(ROOT, "index.html")
    src = open(p, encoding="utf-8").read()
    src = re.sub(r"<!-- @header -->.*?<!-- /@header -->", lambda _: "<!-- @header -->\n  " + header("") + "\n  <!-- /@header -->", src, flags=re.S)
    src = re.sub(r"<!-- @footer -->.*?<!-- /@footer -->", lambda _: "<!-- @footer -->\n  " + footer() + "\n  <!-- /@footer -->", src, flags=re.S)
    open(p, "w", encoding="utf-8", newline="\n").write(src)
    print("stamped /index.html")


def write_sitemap(routes):
    today = date.today().isoformat()
    urls = ["/"] + sorted(routes)
    body = "\n".join(f"  <url><loc>{DOMAIN}{u}</loc><lastmod>{today}</lastmod></url>" for u in urls)
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n'
    )
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n").write(
        f"User-agent: *\nAllow: /\nDisallow: /dashboard/\n\nSitemap: {DOMAIN}/sitemap.xml\n"
    )
    print(f"sitemap: {len(urls)} urls")


if __name__ == "__main__":
    build()
