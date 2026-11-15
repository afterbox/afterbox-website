import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const swatches = [
  ["ground", "bg-ground"], ["card", "bg-card"], ["line", "bg-line"], ["ink", "bg-ink"], ["ink-soft", "bg-ink-soft"],
  ["mist", "bg-mist"], ["haze", "bg-haze"], ["glass", "bg-glass"], ["dusk", "bg-dusk"], ["ink-deep", "bg-ink-deep"],
  ["panel", "bg-panel"], ["night", "bg-night"], ["positive", "bg-positive"], ["warn", "bg-warn"], ["alert", "bg-alert"],
];

export default function DesignPage() {
  return (
    <main className="mx-auto max-w-6xl px-page py-section">
      <h1 className="text-display-l">Design system</h1>
      <p className="mt-4 text-body-l text-ink-soft">afterbox · Everyday · Ink blue. Light only.</p>

      <section className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {swatches.map(([name, cls]) => (
          <div key={name}>
            <div className={`${cls} h-24 rounded-card border border-line`} />
            <p className="mt-2 text-sm">{name}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 space-y-6">
        <p className="text-display-xl">Everything you own, in one place.</p>
        <p className="text-display-l">Useful today. Priceless when it matters.</p>
        <p className="text-display-s">Questions</p>
        <p className="text-lead">So the people you trust can find it when it matters.</p>
        <p className="text-body-l text-ink-soft">Find your pensions, policies and accounts automatically.</p>
      </section>

      <section className="mt-16 flex flex-wrap gap-4">
        <a href="#" className="rounded-full bg-ink-deep px-6 py-3.5 font-semibold text-on-night hover:bg-ink-deep-hover">Start your record</a>
        <a href="#" className="rounded-full bg-ink px-6 py-3.5 font-semibold text-ground">Start your record</a>
        <span className="rounded-card bg-night p-3"><a href="#" className="inline-block rounded-full bg-on-night px-6 py-3.5 font-semibold text-ink">Start your record</a></span>
      </section>

      <section className="relative mt-16 h-80 overflow-hidden rounded-card bg-panel">
        <div className="absolute left-0 top-0 size-72 rounded-full bg-glass opacity-30 blur-[70px] animate-drift-a" />
        <div className="absolute bottom-0 right-0 size-60 rounded-full bg-dusk opacity-50 blur-[70px] animate-drift-b" />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(238_234_226/0.12)_1px,transparent_1.5px)] bg-size-[18px_18px]" />
        <p className="relative p-8 text-on-night">Living background for the security key</p>
      </section>
    </main>
  );
}
