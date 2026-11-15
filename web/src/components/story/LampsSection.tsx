import type { CSSProperties } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { photoDate, type Photo } from "@/lib/photos";

import { PhotoCredit, PhotoImage } from "./Photo";

interface Shot {
  photo: Photo;
  title: string;
  text: string;
  alt: string;
}

/** How NASA makes the low Sun on Earth today: three facilities, three photos. */
export function LampsSection({ photos }: { photos: { pool: Photo; floor: Photo; desert: Photo } }) {
  const shots: Shot[] = [
    {
      photo: photos.pool,
      title: "In a pool",
      text: "Divers light the bottom of the 40-foot pool at the Neutral Buoyancy Laboratory, Houston, with one underwater lamp to judge shadows.",
      alt: "Two divers on the floor of a dark pool, lit from the side by a single bright lamp.",
    },
    {
      photo: photos.floor,
      title: "On a flat floor",
      text: "High-intensity lights sit at a low angle over the Flat Floor Facility at NASA Marshall, Huntsville, to cast South Pole shadows.",
      alt: "A lamp low on the horizon of a dark hall throws a long shadow from a boulder mock-up across a draped floor.",
    },
    {
      photo: photos.desert,
      title: "In the desert at night",
      text: "Suited test crews of the Joint EVA Test Team work under lamps near Flagstaff, Arizona, after the Sun has set.",
      alt: "Two suited crew members work at night among shrubs, lit by helmet lights and a lamp, with dark hills behind.",
    },
  ];
  return (
    <section aria-labelledby="lamps-title" className="border-t border-line py-[clamp(88px,14vh,140px)]">
      <div className="wrap">
        <div className="reveal grid gap-6 md:grid-cols-2 md:items-end md:gap-10">
          <div>
            <Eyebrow accent="On Earth today">Lunar lighting tests</Eyebrow>
            <h2
              id="lamps-title"
              className="mt-4 font-display text-[clamp(34px,4vw,58px)] leading-[1.03] tracking-[-0.01em]"
            >
              The low Sun is made with lamps
            </h2>
          </div>
          <p className="max-w-[52ch] text-ink-2">
            A lamp gets the angle right across a test floor. It cannot light a whole valley, and the test has to
            happen at night or indoors. Real terrain under a real low Sun is what is missing.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {shots.map((s, i) => (
            <li key={s.photo.nasa_id} className="reveal" style={{ "--i": i } as CSSProperties}>
              <figure className="group m-0 flex h-full flex-col">
                <div className="relative aspect-[4/3] overflow-hidden rounded-panel border border-line bg-sky-1">
                  <PhotoImage
                    photo={s.photo}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    alt={s.alt}
                    className="size-full object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-3 left-3 rounded-md border border-line-2 bg-sky-0/75 px-2 py-0.5 font-mono text-[11px] text-ink backdrop-blur-[6px]">
                    {photoDate(s.photo)}
                  </span>
                </div>
                <figcaption className="mt-4 flex flex-1 flex-col gap-2 px-0.5">
                  <h3 className="text-[15px] font-medium text-ink">{s.title}</h3>
                  <p className="text-sm text-ink-2">{s.text}</p>
                  <PhotoCredit photo={s.photo} className="mt-auto pt-1" />
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <a
          href="#ring"
          className="reveal group mt-14 inline-flex items-baseline gap-3 font-display text-[clamp(24px,2.4vw,34px)] leading-tight text-ink no-underline"
        >
          <span>
            So where on Earth does the real Sun sit this low, <em className="text-sun-pale">for hours?</em>
          </span>
          <span aria-hidden="true" className="text-sun transition-transform duration-300 ease-soft group-hover:translate-y-1">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
