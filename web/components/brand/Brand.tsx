"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { BRAND_ASSETS, BRAND_I18N } from "@/lib/brand";

interface SizedProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 24, className = "" }: SizedProps) {
  const { t } = useTranslation();
  return (
    <Image
      unoptimized
      src={BRAND_ASSETS.mark}
      alt={t(BRAND_I18N.name)}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`select-none rounded-[28%] ${className}`}
      draggable={false}
    />
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={`xw-wordmark ${className}`}>
      <span className="xw-wordmark-name">{t(BRAND_I18N.short)}</span>
      <span className="xw-wordmark-suffix">{t(BRAND_I18N.suffix)}</span>
    </span>
  );
}

export function BrandLockup({
  size = 24,
  className = "",
}: SizedProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark size={size} />
      <BrandWordmark />
    </span>
  );
}

export function XiaowenAvatar({ size = 40, className = "" }: SizedProps) {
  const { t } = useTranslation();
  return (
    <Image
      unoptimized
      src={BRAND_ASSETS.avatar}
      alt={t(BRAND_I18N.short)}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`xw-avatar select-none ${className}`}
      draggable={false}
    />
  );
}
