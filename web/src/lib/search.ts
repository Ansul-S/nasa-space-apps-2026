/**
 * Planner search: the calculated sites and Moon features are matched in the
 * browser; any other place on Earth comes from the Photon geocoder
 * (komoot, OpenStreetMap data).
 */
import type { SiteMeta } from "./data.ts";
import type { MoonFeature } from "./moon-features.ts";

export const PHOTON_URL = "https://photon.komoot.io/api/";
export const PHOTON_CREDIT = "Place search by Photon · data © OpenStreetMap contributors";

export interface Place {
  name: string;
  /** Region and country, for the result list and the card. */
  detail: string;
  lat: number;
  lon: number;
}

export type SearchResult =
  | { kind: "site"; key: string; site: SiteMeta }
  | { kind: "moon"; key: string; feature: MoonFeature }
  | { kind: "place"; key: string; place: Place };

/** Lower case without accents, so "utqiagvik" finds "Utqiaġvik". */
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function matches(query: string, ...fields: string[]): number {
  const q = fold(query.trim());
  if (!q) return 0;
  const text = fold(fields.join(" "));
  if (text.startsWith(q)) return 3;
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text)) return 2;
  return text.includes(q) ? 1 : 0;
}

/** Calculated sites and Moon features that match `query`, best first. */
export function localResults(
  query: string,
  sites: SiteMeta[],
  features: MoonFeature[],
  moonFirst = false,
): SearchResult[] {
  const siteHits = sites
    .map((site) => ({ site, m: matches(query, site.name, site.region, site.id) }))
    .filter((x) => x.m > 0)
    .sort((a, b) => b.m - a.m)
    .map(({ site }): SearchResult => ({ kind: "site", key: `site:${site.id}`, site }));
  const moonHits = features
    .map((feature) => ({ feature, m: matches(query, feature.name, feature.note, "moon lunar") }))
    .filter((x) => x.m > 0)
    .sort((a, b) => b.m - a.m)
    .map(({ feature }): SearchResult => ({ kind: "moon", key: `moon:${feature.id}`, feature }));
  return moonFirst ? [...moonHits, ...siteHits] : [...siteHits, ...moonHits];
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_id?: number;
    osm_type?: string;
  };
}

/** Places from a Photon GeoJSON response. Features without a name or point are skipped. */
export function parsePhoton(json: unknown): Place[] {
  const features = (json as { features?: PhotonFeature[] })?.features;
  if (!Array.isArray(features)) return [];
  const out: Place[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const c = f.geometry?.coordinates;
    const p = f.properties ?? {};
    if (!p.name || !Array.isArray(c) || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const parts = [p.city !== p.name ? p.city : undefined, p.state ?? p.county, p.country].filter(
      (x): x is string => !!x && x !== p.name,
    );
    const detail = [...new Set(parts)].join(", ");
    const key = `${p.name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p.name, detail, lat: c[1], lon: c[0] });
  }
  return out;
}

/** Search any place on Earth. Rejects on network errors; abort with `signal`. */
export async function searchPlaces(query: string, signal?: AbortSignal, limit = 6): Promise<Place[]> {
  const url = `${PHOTON_URL}?${new URLSearchParams({ q: query, limit: String(limit), lang: "en" })}`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Place search failed (HTTP ${r.status})`);
  return parsePhoton(await r.json());
}
