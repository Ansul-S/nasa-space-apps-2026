"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { OrbitView } from "@/lib/orbit";
import type { LatLon } from "@/lib/sun";

import { Globe, type GlobeBody, type GlobeTextures, type MarkerSpec, type PatchSpec } from "./Globe";

export interface FocusRequest {
  lat: number;
  lon: number;
  dist?: number;
  /** Changes for every new request, so the same place can be flown to twice. */
  nonce: number;
}

interface GlobeViewProps {
  body: GlobeBody;
  textures: GlobeTextures;
  initialView: OrbitView;
  subsolar: LatLon;
  /** Geometric sun-elevation limits of the band, degrees. */
  band: [number, number];
  markers: MarkerSpec[];
  patch?: PatchSpec | null;
  focus?: FocusRequest | null;
  /** False while the globe is hidden: it stops rendering. */
  active?: boolean;
  /** Pixels to shift the globe's centre to the left, clear of a side panel. */
  centerOffset?: number;
  reducedMotion?: boolean;
  onMarker?: (id: string) => void;
  onPick?: (point: LatLon) => void;
  label: string;
  className?: string;
}

/** React wrapper for {@link Globe}: one WebGL globe with HTML markers and zoom controls. */
export default function GlobeView({
  body,
  textures,
  initialView,
  subsolar,
  band,
  markers,
  patch = null,
  focus = null,
  active = true,
  centerOffset = 0,
  reducedMotion = false,
  onMarker,
  onPick,
  label,
  className,
}: GlobeViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const handlers = useRef({ onMarker, onPick });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handlers.current = { onMarker, onPick };
  }, [onMarker, onPick]);

  // Create the globe once. Its options are read only at creation.
  const init = useRef({ body, textures, initialView, reducedMotion });
  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    if (!host || !canvas || !layer) return;
    let globe: Globe;
    try {
      const o = init.current;
      globe = new Globe(host, canvas, layer, {
        body: o.body,
        textures: o.textures,
        view: o.initialView,
        reducedMotion: o.reducedMotion,
        onMarker: (id) => handlers.current.onMarker?.(id),
        onPick: (p) => handlers.current.onPick?.(p),
        onReady: () => setReady(true),
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    globeRef.current = globe;
    return () => {
      globe.dispose();
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    globeRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    globeRef.current?.setCenterOffset(centerOffset);
  }, [centerOffset]);

  useEffect(() => {
    if (active) globeRef.current?.setSubsolar(subsolar);
  }, [subsolar, active]);

  const [lo, hi] = band;
  useEffect(() => {
    globeRef.current?.setBand(lo, hi);
  }, [lo, hi]);

  useEffect(() => {
    globeRef.current?.setMarkers(markers);
  }, [markers]);

  useEffect(() => {
    globeRef.current?.setPatch(patch);
  }, [patch]);

  useEffect(() => {
    if (focus) globeRef.current?.flyTo(focus.lat, focus.lon, focus.dist);
  }, [focus]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div
        ref={hostRef}
        tabIndex={0}
        aria-roledescription="globe"
        aria-label={`${label}. Drag or use the arrow keys to turn, scroll or press plus and minus to zoom, N for north up.`}
        className="absolute inset-0 cursor-grab touch-none outline-none select-none active:cursor-grabbing focus-visible:shadow-[inset_0_0_0_2px_var(--color-sun)]"
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "block h-full w-full transition-opacity duration-700 ease-soft",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
        <div ref={layerRef} className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto" />
      </div>
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-8 text-center text-[13px] text-ink-3">
          This browser could not start WebGL, so the globe is not shown. The ranked list and site pages still work.
        </div>
      )}
      <div className="absolute top-1/2 right-3 z-[4] flex -translate-y-1/2 flex-col gap-1.5 lg:right-auto lg:left-4">
        <GlobeButton label="Zoom in" className="max-sm:hidden" onClick={() => globeRef.current?.zoomBy(0.8)}>
          <path d="M7 2.5v9M2.5 7h9" />
        </GlobeButton>
        <GlobeButton label="Zoom out" className="max-sm:hidden" onClick={() => globeRef.current?.zoomBy(1.25)}>
          <path d="M2.5 7h9" />
        </GlobeButton>
        <GlobeButton label="North up" onClick={() => globeRef.current?.northUp()}>
          <path d="M7 1.8 10 11 7 9.2 4 11z" fill="currentColor" stroke="none" />
        </GlobeButton>
      </div>
    </div>
  );
}

function GlobeButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "glass grid size-8 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:border-ink-3 hover:text-ink",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
