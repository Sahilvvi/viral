# ViralX — website rework

Travvir-style scroll + 3D site for [ViralX](https://viralx.in), the launch-video studio.
Live: https://viralx-rework.vercel.app

Static site — no build step. GSAP ScrollTrigger + Lenis + Three.js (all via CDN).

- `index.html`, `css/style.css` — page + styles
- `js/main.js` — smooth scroll, 3D stage choreography, hero/launch/tunnel sections
- `js/scene.js` — procedural Three.js products (phone, serum, earbuds, can) and reel-card textures
- `js/sections.js` — work stack, services coverflow, interactive review room, process stage, platforms, vision, launch form
- `assets/` — reel video, product renders, reel cards, frames

## Run locally

```bash
python server.py   # http://localhost:3011 (supports video seeking + /save for exports)
```

`export.html` re-renders product PNGs and reel cards into `export/` (dev only, not deployed).

## Deploy

```bash
npx vercel deploy --prod --yes --scope sahilvvis-projects
```

TODO before launch: connect the contact form (`finalFX` in `js/sections.js`) to the booking tool / inbox.
