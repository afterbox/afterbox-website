import Image from "next/image";
import icon from "@/app/icon.svg";

/** The keyhole mark, drawn from src/app/icon.svg itself: 32px on phones, 44px from 640px. */
export default function BrandMark() {
  return <Image src={icon} alt="" unoptimized className="mx-auto mb-5 block size-8 sm:size-11" />;
}
