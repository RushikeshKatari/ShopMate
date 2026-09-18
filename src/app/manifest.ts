import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopMate",
    short_name: "ShopMate",
    description: "Voice-first inventory, sales, and khata assistant for local shops.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    orientation: "any",
    icons: [
      { src: "/shopmate-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/shopmate-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
