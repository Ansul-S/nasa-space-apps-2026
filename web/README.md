# Web

Static website for the seasonal analog planner. It reads the JSON files that the pipeline writes to `public/data/` and needs no server.

```bash
pnpm install
pnpm build      # static site in out/
npx serve out   # preview the build locally
```
