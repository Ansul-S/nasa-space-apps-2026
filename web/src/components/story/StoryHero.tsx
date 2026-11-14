import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatMinutes, formatNumber, MONTHS_LONG, shortName } from "@/lib/format";
import { photoDate, type Photo } from "@/lib/photos";
import { STORY_MONTH, windowMinutes, type StoryData } from "@/lib/story";

import { PhotoCredit, PhotoImage } from "./Photo";

/** The opening: NASA's night-time field test, and why it happens at night. */
export function StoryHero({ story, photo }: { story: StoryData; photo: Photo }) {
  const minutes = windowMinutes(story.days.arizona.windows);
  return (
    <section className="relative isolate flex min-h-[min(calc(100svh-var(--header-h)),980px)] items-end overflow-hidden">
      <PhotoImage
        photo={photo}
        priority
        sizes="100vw"
        alt="Night-time field test near Flagstaff, Arizona: a test crew and a cart lit by a low spotlight, casting long shadows across frosted grass."
        className="absolute inset-0 -z-20 size-full animate-settle object-cover object-[36%_58%] brightness-[0.9] sm:object-[50%_58%] saturate-[0.78]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(5_7_10/0.55)_0%,rgb(5_7_10/0)_28%,rgb(5_7_10/0.18)_55%,var(--color-sky-0)_100%),linear-gradient(90deg,rgb(5_7_10/0.78)_0%,rgb(5_7_10/0.2)_58%,rgb(5_7_10/0)_100%)]"
      />
      <div className="wrap pt-24 pb-12 sm:pb-14">
        <Eyebrow className="animate-rise text-ink-2 [text-shadow:0_1px_14px_rgb(5_7_10/0.95)] [animation-delay:300ms]">
          Flagstaff, Arizona · JETT 3 night run · {photoDate(photo)}
        </Eyebrow>
        <h1 className="mt-5 max-w-[19ch] animate-rise font-display text-[clamp(40px,5vw,78px)] leading-[1] tracking-[-0.012em] [animation-delay:420ms]">
          NASA rehearses South Pole moonwalks <em className="text-sun-pale">at night</em>, under spotlights.
        </h1>
        <p className="mt-6 max-w-[54ch] animate-rise text-[clamp(16px,1.35vw,19px)] leading-relaxed text-ink-2 [animation-delay:560ms]">
          At {shortName(story.target.name)}, a candidate Artemis III landing region near the lunar South Pole, the Sun
          never climbs above {formatNumber(story.target.band_max_deg)}°. On 15 {MONTHS_LONG[STORY_MONTH]} the Sun at the
          Arizona test site passes through that band in{" "}
          <strong className="font-medium text-ink">{formatMinutes(minutes[0])}</strong>, at dawn and again at dusk. So
          the low Sun is made with lamps.
        </p>
        <div className="mt-10 flex animate-rise flex-wrap items-end justify-between gap-6 [animation-delay:700ms]">
          <a
            href="#ring"
            className="group inline-flex items-center gap-2.5 rounded-full border border-line-2 bg-sky-1/60 py-2.5 pr-4 pl-3.5 text-sm text-ink no-underline backdrop-blur-[6px] transition-colors duration-200 hover:border-sun hover:bg-sun/[0.08]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="animate-bob">
              <path
                d="M7 1v11M2.5 7.5 7 12l4.5-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Where does the real Sun do this?
          </a>
          <PhotoCredit photo={photo} className="max-w-[46ch] sm:text-right" />
        </div>
      </div>
    </section>
  );
}
