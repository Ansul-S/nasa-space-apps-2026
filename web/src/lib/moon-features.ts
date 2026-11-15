/**
 * Named places on the Moon for the planner's Moon view.
 *
 * Coordinates are the feature centres in the USGS Gazetteer of Planetary
 * Nomenclature (IAU), planetographic, east longitude from −180° to 180°.
 * `gazetteer` is the feature id: https://planetarynames.wr.usgs.gov/Feature/<id>
 */

export type MoonFeatureKind = "target" | "crater" | "landing";

export interface MoonFeature {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: MoonFeatureKind;
  gazetteer: number;
  /** Planner target id for the two lunar targets. */
  target?: string;
  /** One line shown in search results and on the card. */
  note: string;
}

export const MOON_FEATURES: MoonFeature[] = [
  {
    id: "mons-mouton",
    name: "Mons Mouton",
    lat: -84.6,
    lon: 31.0,
    kind: "target",
    gazetteer: 16070,
    target: "mons-mouton",
    note: "Candidate Artemis landing region",
  },
  {
    id: "mons-malapert",
    name: "Mons Malapert",
    lat: -85.98,
    lon: -1.67,
    kind: "target",
    gazetteer: 16338,
    target: "mons-malapert",
    note: "Candidate Artemis landing region",
  },
  { id: "shackleton", name: "Shackleton crater", lat: -89.67, lon: 129.78, kind: "crater", gazetteer: 5450, note: "Crater at the South Pole" },
  { id: "de-gerlache", name: "de Gerlache crater", lat: -88.4849, lon: -88.3447, kind: "crater", gazetteer: 1439, note: "Polar crater" },
  { id: "sverdrup", name: "Sverdrup crater", lat: -88.3209, lon: -153.3875, kind: "crater", gazetteer: 5782, note: "Polar crater" },
  { id: "shoemaker", name: "Shoemaker crater", lat: -88.137, lon: 45.911, kind: "crater", gazetteer: 5494, note: "Permanently shadowed floor" },
  { id: "slater", name: "Slater crater", lat: -88.0792, lon: 111.2881, kind: "crater", gazetteer: 15325, note: "Polar crater" },
  { id: "haworth", name: "Haworth crater", lat: -87.45, lon: -5.17, kind: "crater", gazetteer: 14502, note: "Permanently shadowed floor" },
  { id: "faustini", name: "Faustini crater", lat: -87.1832, lon: 84.3099, kind: "crater", gazetteer: 1919, note: "Permanently shadowed floor" },
  { id: "cabeus", name: "Cabeus crater", lat: -85.3303, lon: -42.1327, kind: "crater", gazetteer: 953, note: "LCROSS impact site" },
  { id: "nobile", name: "Nobile crater", lat: -85.2752, lon: 53.2725, kind: "crater", gazetteer: 4321, note: "Polar crater" },
  { id: "malapert", name: "Malapert crater", lat: -84.9998, lon: 11.4031, kind: "crater", gazetteer: 3603, note: "Polar crater" },
  { id: "amundsen", name: "Amundsen crater", lat: -84.4398, lon: 83.0691, kind: "crater", gazetteer: 247, note: "Polar crater" },
  {
    id: "statio-shiv-shakti",
    name: "Statio Shiv Shakti",
    lat: -69.3734,
    lon: 32.3198,
    kind: "landing",
    gazetteer: 16272,
    note: "Chandrayaan-3 landing site, 2023",
  },
  {
    id: "statio-tianhe",
    name: "Statio Tianhe",
    lat: -45.45,
    lon: 177.6,
    kind: "landing",
    gazetteer: 15781,
    note: "Chang'e-4 landing site, 2019",
  },
  {
    id: "statio-tranquillitatis",
    name: "Statio Tranquillitatis",
    lat: 0.6741,
    lon: 23.4732,
    kind: "landing",
    gazetteer: 5684,
    note: "Apollo 11 landing site, 1969",
  },
];

export const moonFeature = (id: string) => MOON_FEATURES.find((f) => f.id === id);

/** The Moon feature for a planner target id. */
export function targetFeature(targetId: string): MoonFeature {
  const f = MOON_FEATURES.find((x) => x.target === targetId);
  if (!f) throw new Error(`No Moon feature for target ${targetId}`);
  return f;
}
