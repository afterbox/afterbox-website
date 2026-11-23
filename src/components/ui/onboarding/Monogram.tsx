import GroupGlyph from "@/components/ui/GroupGlyph";
import { groupInfo } from "@/lib/categories";

const sizes = {
  xs: "size-6 text-[8px]",
  sm: "size-9 text-xs/[normal]",
  row: "size-10 text-[13px]",
  md: "size-12 text-base",
  lg: "size-14 text-[19px]",
  xl: "size-16 text-[21px]",
} as const;

/** The group's badge at the monogram's lower right: box, glyph size and stroke. None on the 24px stack. */
const badges = {
  xs: null,
  sm: { box: "size-4 -right-1 -bottom-1", icon: 10, stroke: 2.6 },
  row: { box: "size-[18px] -right-1 -bottom-1", icon: 11, stroke: 2.5 },
  md: { box: "size-5 -right-1 -bottom-0.5", icon: 12, stroke: 2.4 },
  lg: { box: "size-6 -right-1 -bottom-0.5", icon: 14, stroke: 2.3 },
  xl: { box: "size-7 -right-0.5 -bottom-0.5", icon: 16, stroke: 2.2 },
} as const;

/**
 * Letters in a mist circle, standing in for a bank or merchant logo. With a find's or item's `group`, its glyph
 * sits on the lower right (named for screen readers); a group the frontend doesn't know shows the letters alone.
 */
export default function Monogram({
  letters,
  size = "sm",
  group = null,
  className = "",
}: {
  letters: string;
  size?: keyof typeof sizes;
  group?: string | null;
  className?: string;
}) {
  const info = groupInfo(group);
  const badge = badges[size];
  const circle = `flex flex-none items-center justify-center rounded-full bg-mist font-semibold text-ink-deep ${sizes[size]}`;
  if (!info || !badge) {
    return (
      <span aria-hidden="true" className={`${circle} ${className}`}>
        {letters}
      </span>
    );
  }
  return (
    <span role="img" aria-label={info.label} title={info.label} className={`relative flex-none ${className}`}>
      <span aria-hidden="true" className={circle}>
        {letters}
      </span>
      <span
        aria-hidden="true"
        className={`absolute flex items-center justify-center rounded-full border border-line bg-card text-ink-deep ${badge.box}`}
      >
        <GroupGlyph icon={info.icon} size={badge.icon} strokeWidth={badge.stroke} />
      </span>
    </span>
  );
}
