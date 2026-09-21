import type { Metadata } from "next";
import "@/styles/globals.css";
import { CRTEffect } from "@/components/pixel/CRTEffect";
import { CustomCursor } from "@/components/pixel/CustomCursor";

export const metadata: Metadata = {
  title: "South Zone Badminton Championship 2026",
  description: "The South Converges. The Court Decides. Official 16-Bit Retro Arcade Interactive Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-pixel-black text-pixel-cream overflow-x-hidden min-h-screen">
        <CustomCursor />
        <CRTEffect />
        {children}
      </body>
    </html>
  );
}
