import type { Metadata } from "next";
import "@/styles/globals.css";
import { CRTEffect } from "@/components/pixel/CRTEffect";
import { CustomCursor } from "@/components/pixel/CustomCursor";

export const metadata: Metadata = {
  title: "South Zone Women's Badminton Championship 2026",
  description: "The South Converges. The Court Decides. Official South Zone Women's Badminton Championship 2026 Platform.",
};

import { AuthProvider } from "@/lib/rbac/useAuth";
import { GlobalErrorHandler } from "@/components/common/GlobalErrorHandler";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-pixel-black text-pixel-cream overflow-x-hidden min-h-screen">
        <GlobalErrorHandler />
        <AuthProvider>
          <CustomCursor />
          <CRTEffect />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
