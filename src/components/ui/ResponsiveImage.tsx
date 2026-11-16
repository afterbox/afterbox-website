type ResponsiveImageProps = {
  src: string;
  width: number;
  height: number;
  /** Served below 768px. Without it, src is used at every width. */
  mobileSrc?: string;
  mobileWidth?: number;
  mobileHeight?: number;
  alt: string;
  /** Extra classes for the image, e.g. object-position. */
  className?: string;
};

/**
 * Art-directed photo that fills its positioned parent. The parent sets the size,
 * so the space is reserved before the image loads.
 */
export default function ResponsiveImage({
  src,
  width,
  height,
  mobileSrc,
  mobileWidth,
  mobileHeight,
  alt,
  className = "",
}: ResponsiveImageProps) {
  return (
    <picture>
      {mobileSrc && (
        <source media="(max-width: 767px)" srcSet={mobileSrc} width={mobileWidth} height={mobileHeight} />
      )}
      {/* The photos are pre-cropped, pre-sized WebP, so next/image isn't needed. */}
      <img
        src={src}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 size-full rounded-card object-cover ${className}`}
      />
    </picture>
  );
}
