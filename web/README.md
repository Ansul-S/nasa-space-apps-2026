# Web

Static website for the seasonal analog planner. It reads the JSON files that the pipeline writes to `public/data/` and needs no server.

```bash
pnpm install
pnpm build      # static site in out/
npx serve out   # preview the build locally

pnpm test       # sun engines, planner, globe geometry and formatting checks (Node test runner)
pnpm typecheck
pnpm lint
```

## Layout

- `src/app/`: routes. `/` is the story, `/planner/` the planner (`/planner/?view=compare` opens the Earth and Moon side by side), `/sites/` an overview of every site ranked by its best window, `/sites/<id>/` one page per site (generated from `index.json` at build time), and `/methods/` the method, the validation checks and the limits.
- `src/components/shell/`: header, footer and app-wide providers.
- `src/components/ui/`: shared building blocks (buttons, panels, segmented controls, tags, match-level glyphs, stats, callouts).
- `src/lib/data.ts`: types for the pipeline JSON and browser loading. `data.server.ts` reads the same files at build time.
- `src/lib/sun.ts`: NOAA sun position and the low-sun ring, ported from `pipeline/src/analog_pipeline/sun.py`. `sun.test.ts` checks it against the pipeline output for every site and month.
- `src/lib/format.ts`: number, date and unit formatting.
- `src/lib/palette.ts`: runtime copies of the colour tokens in `src/app/globals.css`, including the score ramp.
- `src/lib/moon-sun.ts`: sun position on the Moon from the astronomy-engine ephemeris and the IAU rotation model, checked against JPL Horizons in `moon-sun.test.ts`.
- `src/lib/moon-features.ts`: Moon features for the Moon view, at their IAU gazetteer positions.
- `src/lib/orbit.ts`: globe geometry and the camera orbit, which can pass over the poles.
- `src/lib/planner.ts`: the planner's slice of `index.json`, the ranking, and sun-band hours for any searched point.
- `src/lib/gap-fillers.ts`: for a place without a usable low-sun window, the calculated sites that have one, with their snow cover and wind chill.
- `src/lib/site-view.ts`: the site page's view model: calendar rows and fidelity card lines, including the terrain slope row.
- `src/lib/site-list.ts`: the sites overview: every site ranked by its best low-sun window for the default target and weather limits.
- `src/lib/methods.ts`: the figures on the methods page: the validation checks and the counts it quotes, read from the pipeline output.
- `src/lib/search.ts`: search over the sites and Moon features, plus places on Earth from the Photon geocoder.
- `src/lib/story.ts`: every figure the landing story quotes, read from the pipeline output, and the clock of the story's globe. `story.test.ts` checks the figures.
- `src/lib/photos.ts`: types and helpers for the story photographs in `public/photos/`.
- `src/components/globe/`: the three.js globe (`Globe.ts`, shaders) and its React wrapper.
- `src/components/planner/`: the planner screen: controls, ranked list, clock, search, point cards and gap-fillers.
- `src/components/site/`: the site page: best window, controls, seasonal calendar and fidelity card.
- `src/components/sites/`: the sites overview: its header and one card per site.
- `src/components/methods/`: the methods page: the method sections and the validation check cards.
- `src/components/story/`: the landing story: photo hero, the Moon's low Sun, lamp-lit tests on Earth, the scroll-driven globe, the sun chart, the weather cards and the closing sections.

## Textures

`public/textures/` holds the globe images: NASA GIBS Blue Marble and Black Marble for Earth (plus sharper patches around each site for close zoom), and the NASA SVS CGI Moon Kit colour and LOLA slope maps for the Moon. `scripts/build_textures.py` downloads the sources and rebuilds them:

```bash
python3 scripts/build_textures.py --cache <download dir>   # needs numpy and Pillow
```

## Photographs

`public/photos/` holds the story photographs from the NASA Image and Video Library (images.nasa.gov), resized for the web, and `photos.json` with each photo's credit, date, NASA ID and source page. `scripts/build_photos.py` downloads the originals and rebuilds them:

```bash
python3 scripts/build_photos.py --cache <download dir>   # needs Pillow
```
