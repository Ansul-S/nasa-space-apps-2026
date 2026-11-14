"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { SiteMeta } from "@/lib/data";
import { formatLat, formatLatLon } from "@/lib/format";
import type { MoonFeature } from "@/lib/moon-features";
import { localResults, PHOTON_CREDIT, searchPlaces, type Place, type SearchResult } from "@/lib/search";

interface SearchBoxProps {
  sites: SiteMeta[];
  features: MoonFeature[];
  /** List Moon features before Earth sites (Moon view). */
  moonFirst?: boolean;
  onSelect: (result: SearchResult) => void;
  className?: string;
}

type Remote = { query: string; status: "loading" | "done" | "error"; places: Place[] };

const MIN_REMOTE = 3;
const DEBOUNCE_MS = 280;

/** Search box with a results list: calculated sites, Moon features and any place on Earth. */
export function SearchBox({ sites, features, moonFirst = false, onSelect, className }: SearchBoxProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<Remote | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < MIN_REMOTE) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setRemote({ query: q, status: "loading", places: [] });
      searchPlaces(q, ctrl.signal)
        .then((places) => setRemote({ query: q, status: "done", places }))
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setRemote({ query: q, status: "error", places: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  const current = remote && remote.query === q ? remote : null;
  const results = useMemo(() => {
    const local = localResults(q, sites, features, moonFirst).slice(0, 6);
    const places: SearchResult[] = (current?.places ?? []).map((place, i) => ({
      kind: "place",
      key: `place:${i}:${place.lat},${place.lon}`,
      place,
    }));
    return [...local, ...places].slice(0, 10);
  }, [q, sites, features, moonFirst, current]);

  const show = open && q.length > 0;
  const act = Math.min(active, Math.max(0, results.length - 1));

  const pick = (r: SearchResult | undefined) => {
    if (!r) return;
    setQuery(r.kind === "site" ? r.site.name : r.kind === "moon" ? r.feature.name : r.place.name);
    setOpen(false);
    inputRef.current?.blur();
    onSelect(r);
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="glass flex items-center gap-2.5 rounded-xl px-3 shadow-float transition-colors focus-within:border-sun">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="flex-none text-ink-3">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={show}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={show && results.length ? `${id}-${act}` : undefined}
          aria-label="Search a place on Earth, a calculated site or a Moon feature"
          placeholder="Search a place, site or Moon feature"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.max(0, Math.min(results.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(results[act]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="rounded border border-line-2 px-[5px] py-px font-mono text-[10.5px] text-ink-3 max-sm:hidden">/</kbd>
      </div>
      {show && (
        <div className="glass absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl bg-sky-1/95 shadow-float">
          <ul id={`${id}-list`} role="listbox" aria-label="Search results" className="max-h-[min(360px,50vh)] overflow-y-auto">
            {results.map((r, i) => (
              <li
                key={r.key}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === act}
                onPointerDown={(e) => e.preventDefault()}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(r)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px]",
                  i === act && "bg-sky-3",
                )}
              >
                <ResultLabel r={r} />
              </li>
            ))}
          </ul>
          {!results.length && (
            <p className="px-3.5 py-2.5 text-[12.5px] text-ink-3">
              {q.length < MIN_REMOTE
                ? "Keep typing to search places on Earth."
                : current?.status === "error"
                  ? "Place search is unavailable right now. Sites and Moon features still work."
                  : current?.status === "done"
                    ? "No match."
                    : "Searching…"}
            </p>
          )}
          {q.length >= MIN_REMOTE && (
            <p className="border-t border-line px-3.5 py-2 text-[11px] text-ink-3">
              {current?.status === "loading" ? "Searching places… · " : ""}
              {PHOTON_CREDIT}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultLabel({ r }: { r: SearchResult }) {
  if (r.kind === "site")
    return (
      <>
        <span className="min-w-0 truncate">{r.site.name}</span>
        <small className="flex-none font-mono text-[10.5px] tracking-[0.06em] text-ink-3">CALCULATED SITE</small>
      </>
    );
  if (r.kind === "moon")
    return (
      <>
        <span className="min-w-0 truncate">
          {r.feature.name} <span className="text-ink-3">· {r.feature.note}</span>
        </span>
        <small className="flex-none font-mono text-[10.5px] tracking-[0.06em] text-sun">
          {r.feature.kind === "target" ? "MOON · TARGET" : "MOON"}
        </small>
      </>
    );
  return (
    <>
      <span className="min-w-0 truncate">
        {r.place.name}
        {r.place.detail && <span className="text-ink-3"> · {r.place.detail}</span>}
      </span>
      <small className="flex-none font-mono text-[10.5px] text-ink-3" title={formatLatLon(r.place.lat, r.place.lon)}>
        {formatLat(r.place.lat, 1)}
      </small>
    </>
  );
}
