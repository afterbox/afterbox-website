import { legalEmail, legalUpdated, type LegalDocument } from "@/content/legal";

function Body({ text }: { text: string }) {
  const [before, after] = text.split(legalEmail);
  if (after === undefined) return text;
  return (
    <>
      {before}
      <a href={`mailto:${legalEmail}`} className="font-semibold text-ink-deep underline underline-offset-3">
        {legalEmail}
      </a>
      {after}
    </>
  );
}

export default function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <article className="auth-enter mx-auto px-6 pt-7 pb-14 sm:max-w-[720px] sm:px-10 sm:pt-[72px] sm:pb-[120px]">
      <h1 className="mb-2.5 text-[32px]/[1.08] font-normal tracking-[-0.04em] text-ink sm:text-5xl/[1.08]">
        {document.title}
      </h1>
      <p className="mb-10 text-sm text-ink-soft/70 sm:mb-12">Last updated {legalUpdated}</p>
      {document.sections.map((section) => (
        <section
          key={section.heading}
          className="border-t border-line py-6 first-of-type:border-t-0 first-of-type:pt-0 sm:py-8 sm:first-of-type:pt-0"
        >
          <h2 className="mb-2 text-[17px]/[1.3] font-medium tracking-[-0.015em] text-ink sm:text-[19px]/[1.3]">
            {section.heading}
          </h2>
          <p className="text-[15px]/[1.6] text-ink-soft sm:text-base/[1.6]">
            <Body text={section.body} />
          </p>
        </section>
      ))}
    </article>
  );
}
