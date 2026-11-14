import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FEATURED_SITE } from "@/lib/data";

export const metadata: Metadata = {
  title: "Planner",
  description: "Rank every analog site by month, with the low-sun ring on a 3D globe.",
};

export default function PlannerPage() {
  return (
    <section className="wrap py-24">
      <Eyebrow>Planner</Eyebrow>
      <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(40px,5vw,72px)] leading-none">
        Rank every site for any month.
      </h1>
      <p className="mt-5 max-w-[56ch] text-ink-2">
        The interactive globe, month and hour clock and ranked site list are in progress. The site analysis is
        available now.
      </p>
      <div className="mt-8">
        <ButtonLink href={`/sites/${FEATURED_SITE}/`}>See Inland Ellesmere Island</ButtonLink>
      </div>
    </section>
  );
}
