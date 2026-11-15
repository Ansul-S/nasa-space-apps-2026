"use client";

import type { ComponentProps } from "react";

import { PhotoImage } from "./Photo";

/**
 * The hero photo, loaded at once. It renders as a client component so that
 * its preload hint goes into the story page's HTML only: a server component
 * would also put the hint into the route payload, and every page that
 * prefetches the story would then download the photo.
 */
export function HeroPhoto(props: Omit<ComponentProps<typeof PhotoImage>, "priority">) {
  return <PhotoImage {...props} priority />;
}
