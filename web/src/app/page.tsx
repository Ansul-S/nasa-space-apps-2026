import { DevonSection } from "@/components/story/DevonSection";
import { LampsSection } from "@/components/story/LampsSection";
import { MoonSection } from "@/components/story/MoonSection";
import { RingStory } from "@/components/story/RingStory";
import { PhotoCredits, StoryCta } from "@/components/story/StoryClose";
import { StoryHero } from "@/components/story/StoryHero";
import { TwoSkies } from "@/components/story/TwoSkies";
import { WeatherCards } from "@/components/story/WeatherCards";
import { loadIndex, loadPhotos, loadSite } from "@/lib/data.server";
import type { Photo, PhotoSet } from "@/lib/photos";
import { STORY_SITE_IDS, toStoryData, type StorySiteKey } from "@/lib/story";

/** What each photo shows, for the credits list; in the order they appear. */
const PHOTO_SUBJECTS: [id: string, subject: string][] = [
  ["jett3-night-run", "JETT 3 engineering night run, Flagstaff, Arizona"],
  ["artemis2-moon", "South Pole–Aitken basin from Orion, Artemis II"],
  ["nbl-lighting", "Lunar lighting evaluation, Neutral Buoyancy Laboratory"],
  ["msfc-flat-floor", "Lunar lighting simulation, Flat Floor Facility, NASA Marshall"],
  ["jett3-night-crew", "JETT 3 night run, Flagstaff, Arizona"],
  ["devon-k10", "K-10 rovers at Haughton crater, Devon Island"],
];

function photo(photos: PhotoSet, id: string): Photo {
  const p = photos[id];
  if (!p) throw new Error(`Photo ${id} is missing from public/photos/photos.json`);
  return p;
}

/** The landing story: from NASA's night-time field tests to the right place at the right time. */
export default async function Home() {
  const keys = Object.keys(STORY_SITE_IDS) as StorySiteKey[];
  const [index, photos, ...sites] = await Promise.all([
    loadIndex(),
    loadPhotos(),
    ...keys.map((k) => loadSite(STORY_SITE_IDS[k])),
  ]);
  const details = Object.fromEntries(keys.map((k, i) => [k, sites[i]])) as Parameters<typeof toStoryData>[1];
  const story = toStoryData(index, details);

  return (
    <>
      <StoryHero story={story} photo={photo(photos, "jett3-night-run")} />
      <MoonSection story={story} photo={photo(photos, "artemis2-moon")} />
      <LampsSection
        photos={{
          pool: photo(photos, "nbl-lighting"),
          floor: photo(photos, "msfc-flat-floor"),
          desert: photo(photos, "jett3-night-crew"),
        }}
      />
      <RingStory story={story} />
      <TwoSkies story={story} />
      <WeatherCards story={story} />
      <DevonSection story={story} photo={photo(photos, "devon-k10")} />
      <StoryCta story={story} />
      <PhotoCredits entries={PHOTO_SUBJECTS.map(([id, subject]) => ({ photo: photo(photos, id), subject }))} />
    </>
  );
}
