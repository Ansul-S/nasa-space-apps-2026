"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export interface Size {
  width: number;
  height: number;
}

/**
 * The rendered size of an element. Charts draw at this size so text stays at
 * its real pixel size on every screen. Until the first measurement it returns
 * `fallback`, which the server render also uses.
 */
export function useSize<T extends HTMLElement>(fallback: Size) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Tweens an array of numbers to each new `target` of the same length, so a
 * curve morphs instead of jumping. Returns the current values and whether
 * they have reached `target`. With reduced motion it jumps.
 */
export function useTweenedArray(target: readonly number[], duration = 700): [readonly number[], boolean] {
  const reduce = useReducedMotion();
  const [values, setValues] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const jump = reduce || from.length !== target.length;
    const tick = (now: number) => {
      const t = jump ? 1 : Math.min(1, (now - start) / duration);
      const k = easeInOutCubic(t);
      const next = t >= 1 ? target : from.map((a, i) => a + (target[i] - a) * k);
      shown.current = next;
      setValues(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return [values, values === target];
}
