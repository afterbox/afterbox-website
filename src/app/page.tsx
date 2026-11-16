import Faq from "@/components/landing/Faq";
import FlowBackground from "@/components/landing/FlowBackground";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Household from "@/components/landing/Household";
import HowItWorks from "@/components/landing/HowItWorks";
import Nav from "@/components/landing/Nav";
import Security from "@/components/landing/Security";
import UsefulToday from "@/components/landing/UsefulToday";
import { faqs } from "@/content/faqs";
import { siteName, siteUrl } from "@/content/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      email: "hello@afterbox.co.uk",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

// Subtle fade-and-rise for any block marked data-rise, driven by its own scroll
// position (the `rise` keyframes are in globals.css). CSS only. Browsers without
// view() timelines, and people who prefer reduced motion, get the page as is.
const riseOnScroll =
  "motion-safe:supports-[animation-timeline:view()]:[&_[data-rise]]:[animation-name:rise] motion-safe:supports-[animation-timeline:view()]:[&_[data-rise]]:[animation-fill-mode:both] motion-safe:supports-[animation-timeline:view()]:[&_[data-rise]]:[animation-timeline:view()]";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Nav />
      <main className={riseOnScroll}>
        <Hero />
        <FlowBackground>
          <UsefulToday />
          <HowItWorks />
          <Security />
          <Household />
        </FlowBackground>
        <Faq />
      </main>
      <Footer />
    </>
  );
}
