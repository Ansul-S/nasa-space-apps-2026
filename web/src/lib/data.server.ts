/**
 * Build-time loading of the pipeline output. Server components and
 * generateStaticParams use these; the files are read once per build.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { SCHEMA_VERSION, type AnalogIndex, type SiteDetail } from "./data";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T extends { schema_version: number }>(file: string): Promise<T> {
  const data = JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8")) as T;
  if (data.schema_version !== SCHEMA_VERSION) {
    throw new Error(`${file}: schema_version ${data.schema_version}, expected ${SCHEMA_VERSION}`);
  }
  return data;
}

let indexPromise: Promise<AnalogIndex> | null = null;

export function loadIndex(): Promise<AnalogIndex> {
  indexPromise ??= readJson<AnalogIndex>("index.json");
  return indexPromise;
}

export function loadSite(id: string): Promise<SiteDetail> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid site id: ${id}`);
  return readJson<SiteDetail>(path.join("sites", `${id}.json`));
}
