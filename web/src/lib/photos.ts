/**
 * Photographs from the NASA Image and Video Library, written to public/photos
 * by scripts/build_photos.py together with their credits in photos.json.
 */
import { MONTHS } from "./format.ts";

export interface PhotoFile {
  width: number;
  src: string;
}

export interface Photo {
  nasa_id: string;
  title: string;
  /** ISO date the photo was taken. */
  date: string;
  center: string | null;
  /** "NASA/Photographer", as NASA asks. */
  credit: string;
  /** The photo's page on images.nasa.gov. */
  url: string;
  width: number;
  height: number;
  /** Resized copies, narrowest first. */
  files: PhotoFile[];
}

export type PhotoSet = Record<string, Photo>;

export const srcSet = (photo: Photo) => photo.files.map((f) => `${f.src} ${f.width}w`).join(", ");

/** The narrowest copy at least `width` pixels wide, or the widest one. */
export function photoSrc(photo: Photo, width = 1280): string {
  return (photo.files.find((f) => f.width >= width) ?? photo.files[photo.files.length - 1]).src;
}

/** "9 Oct 2022". */
export function photoDate(photo: Photo): string {
  const [y, m, d] = photo.date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "NASA/Bill Stafford · WJS_6267". */
export const creditLine = (photo: Photo) => `${photo.credit} · ${photo.nasa_id}`;
