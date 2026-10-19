# ViralX — website

Travvir-style scroll + 3D site for [ViralX](https://viralx.in), the launch-video studio.
Live: https://viralx-rework.vercel.app

Static site, no build step for the homepage. GSAP ScrollTrigger + Lenis + Three.js (CDN).

## Structure
- `index.html`, `css/style.css`, `js/main.js`, `js/scene.js`, `js/sections.js` — the 3D homepage
- `css/pages.css`, `js/page.js` — inner pages (shared header/footer, menu, forms, reveals)
- `tools/pages/*.html` — **source** for every inner page (discover, explore, pricing, blog, about, contact, signup, login, dashboard, legal, built-with-claude, 404)
- `tools/site.json` — company details (email, phone, address, socials, GSTIN). **Dummy values — replace before launch**
- `tools/build_pages.py` — wraps each page in the shared head/header/footer, writes `<route>/index.html`, `sitemap.xml`, `robots.txt`, and re-stamps the homepage header/footer

```bash
python tools/build_pages.py   # run after editing anything in tools/
python server.py              # http://localhost:3011
```

## Accounts, leads and the client portal (Supabase)
1. Create a free project at supabase.com, run `supabase/schema.sql` in the SQL editor.
2. Authentication → Providers: enable Email (and Google, optional). Add your site URL and `https://www.viralx.in/**` to the redirect URLs.
3. Put the Project URL and anon key in `js/config.js`.

Until those are set, signup/login show a "being set up" notice, contact forms open a pre-filled email, and the newsletter says to email us.

## Deploy
```bash
npx vercel deploy --prod --yes --scope sahilvvis-projects
```

## Temporary: "Built with Claude" page
`tools/pages/built-with-claude.html` + the "Built with Claude" link in `footer()` of `tools/build_pages.py`. To remove: delete the page, delete that link, rerun the build, delete the `built-with-claude/` folder.
