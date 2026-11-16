"use client";

import { useEffect, useRef } from "react";

/**
 * Background video for the hero. The poster sits behind it, is art-directed the
 * same way, is the LCP element, and is all that reduced-motion users see.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Some phones ignore autoplay (low-power mode, or after the tab was in the
  // background), so start playback by hand. A refusal just leaves the poster.
  useEffect(() => {
    const play = () => {
      const video = videoRef.current;
      if (!video || document.visibilityState !== "visible") return;
      video.muted = true;
      video.play().catch(() => {});
    };

    play();
    document.addEventListener("visibilitychange", play);
    return () => document.removeEventListener("visibilitychange", play);
  }, []);

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
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        <source src="/videos/hero-mobile.mp4" type="video/mp4" media="(max-width: 767px)" />
        <source src="/videos/hero-desktop.webm" type="video/webm" />
        <source src="/videos/hero-desktop.mp4" type="video/mp4" />
      </video>
    </>
  );
}
