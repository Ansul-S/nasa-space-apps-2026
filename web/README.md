# Web

Static website for the seasonal analog planner. It reads the JSON files that the pipeline writes to `public/data/` and needs no server.

```bash
pnpm install
pnpm build      # static site in out/
npx serve out   # preview the build locally

pnpm test       # sun engine and formatting checks (Node test runner)
pnpm typecheck
pnpm lint
```

## Layout

- `src/app/`: routes. `/` is the story, `/planner/` the planner, `/sites/<id>/` one page per site (generated from `index.json` at build time).
- `src/components/shell/`: header, footer and app-wide providers.
- `src/components/ui/`: shared building blocks (buttons, panels, segmented controls, tags, match-level glyphs, stats, callouts).
- `src/lib/data.ts`: types for the pipeline JSON and browser loading. `data.server.ts` reads the same files at build time.
- `src/lib/sun.ts`: NOAA sun position and the low-sun ring, ported from `pipeline/src/analog_pipeline/sun.py`. `sun.test.ts` checks it against the pipeline output for every site and month.
- `src/lib/format.ts`: number, date and unit formatting.
- `src/lib/palette.ts`: runtime copies of the colour tokens in `src/app/globals.css`, including the score ramp.
