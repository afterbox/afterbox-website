import type { ReactNode } from "react";
import { BankIcon, CalendarRepeatIcon, CardIcon, DocumentIcon, HandshakeIcon, HomeIcon, LockIcon, ReceiptIcon, RepeatIcon, TrendIcon, UmbrellaIcon } from "@/components/ui/icons";
import type { CategoryIcon, GroupIcon } from "@/lib/api/types";

const sizes = { sm: "size-8", md: "size-[34px]", lg: "size-10" } as const;

/** Rounded mist square holding an icon (rows, tiles, headers). */
export default function IconSquare({
  size = "sm",
  muted = false,
  children,
}: {
  size?: keyof typeof sizes;
  /** Waiting steps: ground fill, soft icon. */
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-field transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ${sizes[size]} ${
        muted ? "bg-ground text-ink-soft/70" : "bg-mist text-ink-deep"
      }`}
    >
      {children}
    </span>
  );
}

const categoryIcons = {
  umbrella: UmbrellaIcon,
  trend: TrendIcon,
  home: HomeIcon,
  lock: LockIcon,
  card: CardIcon,
  repeat: RepeatIcon,
  receipt: ReceiptIcon,
  bank: BankIcon,
  document: DocumentIcon,
  // Group glyphs (lib/categories groups).
  handshake: HandshakeIcon,
  "calendar-repeat": CalendarRepeatIcon,
} as const;

/** An icon the frontend doesn't know yet shows the "Something else" document. */
export function CategoryGlyph({ icon, size }: { icon: CategoryIcon | GroupIcon | string; size: number }) {
  const Icon = categoryIcons[icon as keyof typeof categoryIcons] ?? DocumentIcon;
  return <Icon size={size} />;
}
