// Single source for white-label assets. Swap the files under
// `public/brand/` (and the palette in `app/brand.css`) to rebrand.
export const BRAND_ASSETS = {
  mark: "/brand/logo-mark.svg",
  avatar: "/brand/avatar-xiaowen.svg",
  favicon16: "/brand/favicon-16x16.png",
  favicon32: "/brand/favicon-32x32.png",
  appleTouch: "/brand/apple-touch-icon.png",
} as const;

export const BRAND_I18N = {
  name: "brand.name",
  short: "brand.short",
  suffix: "brand.suffix",
  tagline: "brand.tagline",
  welcomeSubtitle: "brand.welcomeSubtitle",
  footer: "brand.footer",
  loading: "brand.loading",
} as const;

export const BRAND_METADATA = {
  title: "小文 AI 学伴",
  description: "陪小学生一步步想明白的 AI 学伴",
} as const;
