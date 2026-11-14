import type { Metadata } from "next";

import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="wrap py-28">
      <Eyebrow accent="404">Off the map</Eyebrow>
      <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(40px,5vw,72px)] leading-none">
        This place is not on our map.
      </h1>
      <p className="mt-5 max-w-[52ch] text-ink-2">The page may have moved. The planner covers every site we calculate.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/planner/" variant="primary">
          Open the planner <Arrow />
        </ButtonLink>
        <ButtonLink href="/">Back to the story</ButtonLink>
      </div>
    </section>
  );
}
