import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { formatDayRange, formatLat, formatNumber, MONTHS_LONG, shortName } from "@/lib/format";
import { photoDate, type Photo } from "@/lib/photos";
import type { StoryData } from "@/lib/story";

import { PhotoCredit, PhotoImage } from "./Photo";

/** A known analog site, photographed in July: the right place still needs the right weeks. */
export function DevonSection({ story, photo }: { story: StoryData; photo: Photo }) {
  const { devonJuly: jul, devonBest: bw, campaignDays } = story;
  const devon = story.sites.devon;
  const name = shortName(devon.name);
  const july = MONTHS_LONG[6];
  return (
    <section aria-labelledby="devon-title" className="border-t border-line py-[clamp(88px,14vh,140px)]">
      <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14">
        <figure className="m-0">
          <div className="relative aspect-[3/2] overflow-hidden rounded-panel border border-line bg-sky-1">
            <PhotoImage
              photo={photo}
              sizes="(min-width: 1024px) 58vw, 100vw"
              alt="Two NASA K-10 rovers, one white and one red, on grey gravel at Haughton crater, Devon Island, under a bright, high sky."
              className="size-full object-cover"
            />
            <span className="absolute top-3 left-3 rounded-md border border-line-2 bg-sky-0/75 px-2.5 py-1 font-mono text-[11px] text-ink backdrop-blur-[6px]">
              {photoDate(photo)}
            </span>
          </div>
          <figcaption className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs text-ink-3">
            <span>K-10 rovers survey Haughton crater, Devon Island.</span>
            <PhotoCredit photo={photo} />
          </figcaption>
        </figure>

        <div>
          <Eyebrow accent="A known analog">
            {name} · {formatLat(devon.lat, 1)}
          </Eyebrow>
          <h2
            id="devon-title"
            className="mt-4 max-w-[15ch] font-display text-[clamp(34px,3.8vw,54px)] leading-[1.04] tracking-[-0.01em]"
          >
            The right place still needs <em className="text-sun-pale">the right weeks</em>
          </h2>
          <p className="mt-5 max-w-[48ch] text-ink-2">
            NASA has studied Haughton crater as a Mars analog since 1997. In {july}, when this photo was taken, the Sun
            never sets: it dips into the band only around midnight, {formatNumber(jul.bandHours)} h a day, and the mean
            cloud cover is {formatNumber(jul.cloudMean, 0)}%. For a South Pole lighting test, {name} has other weeks.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <Panel className="p-5">
              <Eyebrow>{july}</Eyebrow>
              <Stat
                className="mt-2.5"
                size="md"
                tone={jul.expected < 0.05 ? "muted" : "default"}
                value={formatNumber(jul.expected)}
                unit={`of ${campaignDays}`}
                label="expected usable days"
              />
            </Panel>
            <Panel tone="sun" className="p-5">
              <Eyebrow accent="Best window" />
              <Stat
                className="mt-2.5"
                size="md"
                tone="sun"
                value={formatNumber(bw.held_out_mean)}
                unit={`of ${campaignDays}`}
                label={`${formatDayRange(bw.start, bw.end)} · held out`}
              />
            </Panel>
          </div>
          <ButtonLink href={`/sites/${devon.id}/`} className="mt-8">
            See {name} <Arrow />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
