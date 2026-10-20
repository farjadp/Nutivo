import type { MetadataRoute } from "next";

/** Install as an app (PWA). Icons are built from the brand board by scripts/build-brand-assets.mjs. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutivo · تغذیه هوشمند",
    short_name: "Nutivo",
    description: "دستیار تغذیه‌ای که می‌داند چه خورده‌ای و کمک می‌کند انتخاب بعدی بهتری داشته باشی.",
    lang: "fa",
    dir: "rtl",
    start_url: "/today",
    display: "standalone",
    background_color: "#FAF9F6",
    theme_color: "#007F71",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
