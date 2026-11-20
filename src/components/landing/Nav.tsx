import { Link } from "@/components/ui/Links";
import Button from "@/components/ui/Button";
import MobileMenu from "./MobileMenu";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
  { href: "/login", label: "Log in" },
];

/** Sits over the hero, inside its inset frame. Not sticky: it scrolls away with the hero. */
export default function Nav() {
  return (
    <header className="absolute inset-x-2 top-2 z-10 text-on-night md:inset-x-gutter md:top-gutter [&_:focus-visible]:outline-on-night">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1416px] items-center justify-between gap-6 py-3 pr-3 pl-5 md:px-9 md:py-6"
      >
        <Link href="/" name="nav-wordmark" className="text-[22px] font-semibold tracking-[-0.035em] md:text-[26px]">
          afterbox
        </Link>

        <div className="hidden gap-9 text-[15px] font-medium md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} name={`nav-${link.label.toLowerCase().replaceAll(" ", "-")}`} className="py-2 hover:opacity-85">
              {link.label}
            </Link>
          ))}
        </div>

        <Button href="/signup" name="nav-signup" variant="light" size="sm" className="max-md:hidden">
          Start your record
        </Button>

        <MobileMenu links={links} />
      </nav>
    </header>
  );
}
