import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";
type Size = "md" | "sm";

interface StyleProps {
  variant?: Variant;
  size?: Size;
}

const BASE =
  "group inline-flex items-center justify-center gap-2.5 rounded-full border whitespace-nowrap " +
  "transition-[translate,background-color,border-color,color] duration-200 ease-soft " +
  "hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "border-sun bg-sun font-medium text-ink-on-sun shadow-sun hover:border-sun-pale hover:bg-sun-pale",
  ghost: "border-line-2 bg-transparent text-ink hover:border-ink-3",
};

const SIZES: Record<Size, string> = {
  md: "px-5 py-3 text-[15px]",
  sm: "px-3.5 py-2 text-[13px]",
};

export function buttonClass({ variant = "ghost", size = "md" }: StyleProps = {}, className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

/** A link styled as a button. */
export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonClass({ variant, size }, className)} {...props} />;
}

/** Trailing arrow for call-to-action buttons. */
export function Arrow() {
  return (
    <span aria-hidden="true" className="transition-transform duration-200 ease-soft group-hover:translate-x-0.5">
      →
    </span>
  );
}
