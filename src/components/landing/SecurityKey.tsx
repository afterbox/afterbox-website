import type { CSSProperties, ReactNode } from "react";
import InView from "@/components/ui/InView";

/*
  The animated key and its living background.

  The key is three parts: ring = You, shaft = afterbox, teeth = Trusted person.
  Each part flies in from its own direction, its label fades in as it lands,
  the joined key glows briefly, holds, then fades and repeats (7s loop, keyframes
  in globals.css). Only transform and opacity animate.

  Without motion (prefers-reduced-motion) nothing animates, which leaves the key
  assembled with all three labels showing.
*/

type Rect = { x: number; y: number; width: number; height: number };

type KeyGeometry = {
  width: number;
  height: number;
  ring: { cx: number; cy: number; r: number; strokeWidth: number };
  shaft: Rect;
  teeth: Rect[];
  cornerRadius: number;
  fontSize: number;
  /** Label positions for You, afterbox, Trusted person. */
  labels: [number, number][];
  /** Where the ring, shaft and teeth start from, relative to their final position. */
  offsets: [number, number][];
};

// Both geometries are the design's: 320×440 on desktop, 240×260 on mobile.
const desktopKey: KeyGeometry = {
  width: 320,
  height: 440,
  ring: { cx: 120, cy: 110, r: 52, strokeWidth: 14 },
  shaft: { x: 113, y: 162, width: 14, height: 138 },
  teeth: [
    { x: 113, y: 300, width: 14, height: 72 },
    { x: 127, y: 322, width: 34, height: 14 },
    { x: 127, y: 352, width: 24, height: 14 },
  ],
  cornerRadius: 4,
  fontSize: 17,
  labels: [
    [190, 116],
    [150, 238],
    [176, 350],
  ],
  offsets: [
    [-70, -50],
    [80, 0],
    [-40, 70],
  ],
};

const mobileKey: KeyGeometry = {
  width: 240,
  height: 260,
  ring: { cx: 80, cy: 62, r: 34, strokeWidth: 10 },
  shaft: { x: 75, y: 96, width: 10, height: 92 },
  teeth: [
    { x: 75, y: 188, width: 10, height: 46 },
    { x: 85, y: 200, width: 24, height: 10 },
    { x: 85, y: 220, width: 16, height: 10 },
  ],
  cornerRadius: 3,
  fontSize: 14,
  labels: [
    [128, 68],
    [100, 148],
    [120, 222],
  ],
  offsets: [
    [-50, -40],
    [60, 0],
    [-30, 50],
  ],
};

const labels = ["You", "afterbox", "Trusted person"];

// Literal class names so Tailwind can see them.
const partAnimations = [
  "motion-safe:animate-key-p1",
  "motion-safe:animate-key-p2",
  "motion-safe:animate-key-p3",
];
const labelAnimations = [
  "motion-safe:animate-key-l1",
  "motion-safe:animate-key-l2",
  "motion-safe:animate-key-l3",
];

/** The ring, shaft and teeth, in that order. */
function keyParts(key: KeyGeometry): ReactNode[] {
  const rect = (r: Rect) => (
    <rect key={`${r.x}-${r.y}`} {...r} rx={key.cornerRadius} className="fill-glass" />
  );

  return [
    <circle
      key="ring"
      cx={key.ring.cx}
      cy={key.ring.cy}
      r={key.ring.r}
      strokeWidth={key.ring.strokeWidth}
      className="fill-none stroke-glass"
    />,
    rect(key.shaft),
    key.teeth.map(rect),
  ];
}

function Key({ geometry, className }: { geometry: KeyGeometry; className: string }) {
  const viewBox = `0 0 ${geometry.width} ${geometry.height}`;
  const parts = keyParts(geometry);

  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: `${geometry.width} / ${geometry.height}` }}
    >
      {/*
        The glow once the key has joined: a blurred copy of the whole key whose
        opacity animates. The blur is static, so it is painted once.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-0 motion-safe:animate-key-lock"
      >
        <svg viewBox={viewBox} className="size-full overflow-visible blur-[10px]">
          {parts}
        </svg>
      </div>

      <svg
        viewBox={viewBox}
        role="img"
        aria-label="Three parts of a key, held by you, afterbox and your trusted person, come together to make one key"
        className="absolute inset-0 size-full"
      >
        {parts.map((part, i) => (
          <g
            key={i}
            className={partAnimations[i]}
            style={
              {
                "--key-x": `${geometry.offsets[i][0]}px`,
                "--key-y": `${geometry.offsets[i][1]}px`,
              } as CSSProperties
            }
          >
            {part}
          </g>
        ))}
        {labels.map((label, i) => (
          <text
            key={label}
            x={geometry.labels[i][0]}
            y={geometry.labels[i][1]}
            fontSize={geometry.fontSize}
            className={`fill-on-night ${labelAnimations[i]}`}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

const glowBase = "absolute rounded-full blur-[50px] md:blur-[70px]";

export default function SecurityKey({ className = "" }: { className?: string }) {
  return (
    // InView flags the card when it leaves the viewport, and the last class pauses every animation inside it.
    <InView
      className={`relative flex h-80 w-full items-center justify-center overflow-hidden rounded-card bg-panel md:h-[540px] lg:aspect-[400/540] lg:h-auto lg:max-w-[400px] [&[data-inview=false]_*]:[animation-play-state:paused] ${className}`}
    >
      {/* Living background: three soft glows drifting on long, offset loops */}
      <div
        aria-hidden="true"
        className={`${glowBase} top-0 left-0 size-60 bg-glass opacity-[0.28] motion-safe:animate-drift-a md:size-[360px]`}
      />
      <div
        aria-hidden="true"
        className={`${glowBase} right-0 bottom-0 size-[200px] bg-dusk opacity-50 motion-safe:animate-drift-b md:size-[300px]`}
      />
      <div
        aria-hidden="true"
        className={`${glowBase} top-1/3 left-1/4 size-40 bg-glass opacity-[0.14] motion-safe:animate-drift-c md:size-60`}
      />
      {/* A very slow light sweep across the card */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-on-night/7 to-transparent motion-safe:animate-sweep motion-reduce:hidden"
      />
      {/* Faint dot grid on top */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(rgb(238_234_226/0.12)_1px,transparent_1.5px)] bg-size-[16px_16px] md:bg-size-[18px_18px]"
      />

      <Key geometry={mobileKey} className="w-60 md:hidden" />
      <Key geometry={desktopKey} className="w-[320px] max-w-[80%] max-md:hidden" />
    </InView>
  );
}
