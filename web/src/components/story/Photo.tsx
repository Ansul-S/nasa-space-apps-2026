import { cn } from "@/lib/cn";
import { creditLine, photoSrc, srcSet, type Photo } from "@/lib/photos";

interface PhotoImageProps {
  photo: Photo;
  alt: string;
  /** The `sizes` attribute: how wide the image is drawn. */
  sizes: string;
  /** Load at once, for the image at the top of the page. */
  priority?: boolean;
  className?: string;
}

/**
 * A NASA photo from public/photos. The resized copies are built in advance
 * (scripts/build_photos.py), so a plain img with srcset serves them.
 */
export function PhotoImage({ photo, alt, sizes, priority = false, className }: PhotoImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: the responsive copies are prebuilt
    <img
      src={photoSrc(photo)}
      srcSet={srcSet(photo)}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

/** "Photo: NASA/Bill Stafford · WJS_6267", linked to the photo's page on images.nasa.gov. */
export function PhotoCredit({ photo, className }: { photo: Photo; className?: string }) {
  return (
    <a
      href={photo.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "font-mono text-[10.5px] tracking-[0.04em] text-ink-3 no-underline transition-colors hover:text-ink-2",
        className,
      )}
    >
      Photo: {creditLine(photo)}
    </a>
  );
}
