import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

interface SectionHeadProps {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  /** The explanation beside the title. */
  children?: ReactNode;
}

/** A story section's heading: eyebrow and title on the left, explanation on the right. */
export function SectionHead({ id, eyebrow, title, children }: SectionHeadProps) {
  return (
    <div className="reveal mb-10 grid gap-5 md:grid-cols-2 md:items-end md:gap-10">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="mt-3.5 font-display text-[clamp(34px,4vw,58px)] leading-[1.03] tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      {children != null && <p className="max-w-[52ch] text-ink-2">{children}</p>}
    </div>
  );
}
