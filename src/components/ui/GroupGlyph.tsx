import {
  CalendarRepeatIcon,
  CarIcon,
  CloudIcon,
  DumbbellIcon,
  HandshakeIcon,
  HeartHandIcon,
  HomeIcon,
  HomeKeyIcon,
  MusicIcon,
  PhoneIcon,
  PlayIcon,
  WifiIcon,
  WrenchIcon,
} from "@/components/ui/icons";
import type { GroupIcon } from "@/lib/api/types";

const groupIcons = {
  home: HomeIcon,
  car: CarIcon,
  wrench: WrenchIcon,
  phone: PhoneIcon,
  wifi: WifiIcon,
  play: PlayIcon,
  music: MusicIcon,
  cloud: CloudIcon,
  dumbbell: DumbbellIcon,
  handshake: HandshakeIcon,
  "heart-hand": HeartHandIcon,
  "calendar-repeat": CalendarRepeatIcon,
  "home-key": HomeKeyIcon,
} satisfies Record<GroupIcon, unknown>;

/** A worth-a-look group's glyph (lib/categories groups). */
export default function GroupGlyph({ icon, size, strokeWidth, className }: { icon: GroupIcon; size: number; strokeWidth?: number; className?: string }) {
  const Icon = groupIcons[icon];
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
