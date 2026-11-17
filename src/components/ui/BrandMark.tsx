import Image from "next/image";
import icon from "@/app/icon.svg";

/** The keyhole mark, drawn from src/app/icon.svg itself: 36px on phones, 44px from 640px. */
export default function BrandMark() {
  return <Image src={icon} alt="" unoptimized className="mx-auto mb-4 block size-9 sm:mb-5 sm:size-11" />;
}
