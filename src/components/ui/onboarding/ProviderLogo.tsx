import Monogram from "./Monogram";

/** Tink's icon for a bank when it has one, else the monogram. */
export default function ProviderLogo({ name, logoUrl, size = "sm" }: { name: string; logoUrl: string | null; size?: "sm" | "md" }) {
  const letters = name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  if (!logoUrl) return <Monogram letters={letters || "B"} size={size} />;
  return (
    // Tink's CDN icons: a plain img (no next/image optimiser between our CSP and Tink's CDN).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      width={size === "md" ? 48 : 36}
      height={size === "md" ? 48 : 36}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`flex-none rounded-full bg-card object-contain ring-1 ring-line ${size === "md" ? "size-12" : "size-9"}`}
    />
  );
}
