import type { ReactNode } from "react";

/*
  The continuous background behind sections 2–4.

  Everything is anchored to the security section rather than to fixed pixel
  offsets, so the blend lands in the same place at every width:

    ground ─ fade in ─▶ [ security section: solid ink-deep ] ─ fade out ─▶ ground

  <FlowBackground> is the shared ground-coloured canvas. <FlowJoins> is rendered
  inside the security section and paints the two joins just outside its top and
  bottom edges, behind the neighbouring sections' content.

  The security section must not become a stacking context (no transform,
  opacity or z-index on it), or the joins would paint over its neighbours.
*/

// Vertical fades. Stop positions are the design's, as a share of the fade band.
const fadeIn =
  "bg-[linear-gradient(in_oklab_180deg,var(--color-ground),var(--color-mist)_38%,var(--color-dusk)_69%,var(--color-ink-deep))]";
const fadeOut =
  "bg-[linear-gradient(in_oklab_180deg,var(--color-ink-deep),var(--color-dusk)_30%,var(--color-haze)_57%,var(--color-mist)_78%,var(--color-ground))]";

// Wide glass glow straddling each fade. A soft radial falloff stands in for the
// design's 200px blur: it looks the same and costs nothing to paint.
const glassGlow =
  "bg-[radial-gradient(closest-side,var(--color-glass),color-mix(in_oklab,var(--color-glass)_85%,transparent)_25%,color-mix(in_oklab,var(--color-glass)_55%,transparent)_45%,color-mix(in_oklab,var(--color-glass)_25%,transparent)_65%,color-mix(in_oklab,var(--color-glass)_7%,transparent)_85%,transparent)]";

// Ink-deep glow feathering the edge of the security section. It reaches full
// strength exactly at the edge, so there is never a seam against the solid colour.
const inkFeather =
  "bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--color-ink-deep)_6%,transparent)_23%,color-mix(in_oklab,var(--color-ink-deep)_20%,transparent)_45%,color-mix(in_oklab,var(--color-ink-deep)_45%,transparent)_64%,color-mix(in_oklab,var(--color-ink-deep)_75%,transparent)_80%,color-mix(in_oklab,var(--color-ink-deep)_93%,transparent)_91%,var(--color-ink-deep))]";

// Each join is clipped to its own box, which keeps the 200vw glows from causing
// horizontal scroll and stops them spilling onto the security section itself.
const join = "pointer-events-none absolute inset-x-0 -z-10 h-[560px] overflow-hidden md:h-[800px]";
const band = "absolute inset-x-0 h-60 md:h-[360px]";
const glow = `absolute left-1/2 h-[880px] w-[200vw] -translate-x-1/2 md:h-[1240px] ${glassGlow}`;
const feather = `absolute inset-x-0 h-[150px] md:h-[220px] ${inkFeather}`;

export default function FlowBackground({ children }: { children: ReactNode }) {
  return <div className="relative isolate overflow-x-clip bg-ground">{children}</div>;
}

/** Render as a direct child of the (position: relative) security section. */
export function FlowJoins() {
  return (
    <>
      {/*
        Above: ground → mist → dusk → ink-deep. The glow is centred on the fade band.
        Both joins tuck 1px under the section, so no hairline of ground shows through
        at fractional zoom levels or pixel ratios.
      */}
      <div aria-hidden="true" className={`${join} bottom-[calc(100%-1px)]`}>
        <div className={`${band} bottom-0 ${fadeIn}`} />
        <div className={`${glow} -bottom-[320px] opacity-60 md:-bottom-[440px]`} />
        <div className={`${feather} bottom-0`} />
      </div>

      {/* Below: the mirror, ink-deep → dusk → haze → mist → ground. */}
      <div aria-hidden="true" className={`${join} top-[calc(100%-1px)]`}>
        <div className={`${band} top-0 ${fadeOut}`} />
        <div className={`${glow} -top-[320px] opacity-55 md:-top-[440px]`} />
        <div className={`${feather} top-0 -scale-y-100`} />
      </div>
    </>
  );
}
