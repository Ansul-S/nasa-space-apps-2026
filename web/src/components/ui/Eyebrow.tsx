import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EyebrowProps {
  /** Highlighted lead, such as a step number or "Best window". */
  accent?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "div" | "p" | "span";
}

/** Uppercase label above a heading: "01 · The golden ring". */
export function Eyebrow({ accent, children, className, as: Tag = "div" }: EyebrowProps) {
  return (
    <Tag className={cn("eyebrow", className)}>
      {accent != null && <b className="font-medium text-sun">{accent}</b>}
      {accent != null && children != null && " · "}
      {children}
    </Tag>
  );
}
