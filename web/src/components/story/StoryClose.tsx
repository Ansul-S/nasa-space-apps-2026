import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { photoDate, type Photo } from "@/lib/photos";
import type { StoryData } from "@/lib/story";

/** The call to action. */
export function StoryCta({ story }: { story: StoryData }) {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-420px] left-1/2 -z-10 h-[600px] w-[1400px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(255_138_61/0.28),rgb(246_182_90/0.08)_55%,transparent_75%)]"
      />
      <div className="reveal wrap pt-[clamp(96px,16vh,160px)] pb-[clamp(110px,18vh,180px)]">
        <Eyebrow>For field-test leads planning Artemis surface tests</Eyebrow>
        <h2
          id="cta-title"
          className="mt-5 max-w-[16ch] font-display text-[clamp(40px,5.6vw,84px)] leading-none tracking-[-0.012em]"
        >
          Find your place, at <em className="text-sun-pale">the right time</em>.
        </h2>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/planner/" variant="primary">
            Open the planner <Arrow />
          </ButtonLink>
          <ButtonLink href={`/sites/${story.sites.ellesmere.id}/`}>See {story.sites.ellesmere.name}</ButtonLink>
        </div>
      </div>
    </section>
  );
}

export interface CreditEntry {
  photo: Photo;
  /** What the photo shows, in a few words. */
  subject: string;
}

/** Every photo on the page, with its credit and a link to its page on images.nasa.gov. */
export function PhotoCredits({ entries }: { entries: CreditEntry[] }) {
  return (
    <section aria-labelledby="credits-title" className="border-t border-line py-10">
      <div className="wrap">
        <h2 id="credits-title" className="eyebrow">
          Photographs
        </h2>
        <ul className="mt-4 grid gap-x-10 gap-y-2.5 text-xs text-ink-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ photo, subject }) => (
            <li key={photo.nasa_id}>
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="text-ink-2 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink-3"
              >
                {subject}
              </a>
              <br />
              {photo.credit} · {photoDate(photo)} · {photo.nasa_id}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[90ch] text-xs text-ink-3">
          All photographs are from the NASA Image and Video Library, images.nasa.gov. NASA images are generally not
          subject to copyright in the United States; their use here does not imply endorsement by NASA.
        </p>
      </div>
    </section>
  );
}
