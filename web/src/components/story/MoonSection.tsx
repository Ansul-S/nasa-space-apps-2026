import { Eyebrow } from "@/components/ui/Eyebrow";
import { Stat } from "@/components/ui/Stat";
import { formatLat, formatNumber, shortName } from "@/lib/format";
import { photoDate, type Photo } from "@/lib/photos";
import type { StoryData } from "@/lib/story";

import { PhotoCredit, PhotoImage } from "./Photo";

/** Height of a suited astronaut, metres, for the shadow-length example. */
const ASTRONAUT_M = 1.8;

/** The target: what the light is like at the lunar South Pole. */
export function MoonSection({ story, photo }: { story: StoryData; photo: Photo }) {
  const { target } = story;
  const shadow = ASTRONAUT_M / Math.tan((target.band_max_deg * Math.PI) / 180);
  return (
    <section
      id="moon"
      aria-labelledby="moon-title"
      className="relative isolate overflow-hidden border-t border-line"
    >
      <figure className="absolute inset-0 -z-10 m-0">
        <PhotoImage
          photo={photo}
          sizes="100vw"
          alt="Heavily cratered lunar terrain at the edge of the South Pole–Aitken basin, photographed by the Artemis II crew. Near the line between lunar day and night, every crater casts a long shadow."
          className="absolute inset-0 size-full object-cover object-[72%_50%] max-md:opacity-60"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-sky-0)_0%,rgb(5_7_10/0.88)_34%,rgb(5_7_10/0.15)_68%,transparent_100%),linear-gradient(180deg,var(--color-sky-0)_0%,transparent_22%,transparent_78%,var(--color-sky-0)_100%)]"
        />
        <figcaption className="absolute right-0 bottom-0 left-0">
          <div className="wrap flex justify-end pb-6">
            <span className="max-w-[52ch] text-right text-[11.5px] text-ink-3">
              The South Pole–Aitken basin from Orion, {photoDate(photo)}, by the Artemis II crew.{" "}
              <PhotoCredit photo={photo} />
            </span>
          </div>
        </figcaption>
      </figure>

      <div className="wrap pt-[clamp(96px,16vh,170px)] pb-[clamp(120px,20vh,200px)]">
        <Eyebrow accent="The target">
          {shortName(target.name)} · {formatLat(target.lat, 1)}
        </Eyebrow>
        <h2
          id="moon-title"
          className="mt-4 max-w-[14ch] font-display text-[clamp(36px,4.6vw,68px)] leading-[1.02] tracking-[-0.01em]"
        >
          At the lunar South Pole the Sun <em className="text-sun-pale">skims the horizon</em>
        </h2>
        <p className="mt-6 max-w-[46ch] text-[clamp(15px,1.2vw,17px)] leading-relaxed text-ink-2">
          The Sun circles the horizon once a month and never climbs high. Shadows stay long, the light comes from the side
          for days on end, and craters next to sunlit ridges stay dark. Artemis crews will work in this light.
        </p>
        <dl className="reveal mt-12 grid max-w-[680px] grid-cols-1 gap-8 min-[480px]:grid-cols-3 min-[480px]:gap-6">
          <div>
            <dt className="eyebrow">Highest Sun</dt>
            <dd className="mt-2">
              <Stat size="md" tone="sun" value={`${formatNumber(target.band_max_deg)}°`} label="above the horizon" />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">One lap of the horizon</dt>
            <dd className="mt-2">
              <Stat size="md" value={formatNumber(story.lunarDayDays)} unit="days" label="one lunar day" />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Shortest shadow</dt>
            <dd className="mt-2">
              <Stat
                size="md"
                value={formatNumber(shadow, 0)}
                unit="m"
                label={`cast by a ${formatNumber(ASTRONAUT_M)} m astronaut`}
              />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
