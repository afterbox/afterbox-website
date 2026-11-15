/**
 * Background video for the hero. The poster sits behind it, is art-directed the
 * same way, is the LCP element, and is all that reduced-motion users see.
 */
export default function HeroVideo() {
  return (
    <>
      <picture>
        <source media="(max-width: 767px)" srcSet="/videos/hero-mobile-poster.webp" />
        <img
          src="/videos/hero-desktop-poster.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        <source src="/videos/hero-mobile.webm" type="video/webm" media="(max-width: 767px)" />
        <source src="/videos/hero-mobile.mp4" type="video/mp4" media="(max-width: 767px)" />
        <source src="/videos/hero-desktop.webm" type="video/webm" />
        <source src="/videos/hero-desktop.mp4" type="video/mp4" />
      </video>
    </>
  );
}
