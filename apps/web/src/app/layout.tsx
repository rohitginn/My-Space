import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.rohitcode.tech"),
  title: {
    default: "MySpace by Rohit Code | Personal productivity workspace",
    template: "%s | MySpace by Rohit Code",
  },
  description: "MySpace is a personal productivity and collaboration workspace for planning days, organizing tasks and projects, capturing notes, tracking habits, and focusing on meaningful work.",
  applicationName: "MySpace",
  creator: "Rohit Code",
  publisher: "Rohit Code",
  alternates: {
    canonical: "https://app.rohitcode.tech/",
  },
  openGraph: {
    type: "website",
    url: "https://app.rohitcode.tech/",
    siteName: "MySpace by Rohit Code",
    title: "MySpace by Rohit Code | Personal productivity workspace",
    description: "Plan your day, organize projects, track habits, capture ideas, and collaborate in focused Co-Spaces.",
    locale: "en_US",
    images: [
      {
        url: "/images/myspace-planning-collage.png",
        width: 1568,
        height: 1003,
        alt: "MySpace planning workspace with notes, habits, calendar, and focus tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MySpace by Rohit Code | Personal productivity workspace",
    description: "One workspace for planning, notes, tasks, habits, projects, focus, and collaboration.",
    images: ["/images/myspace-planning-collage.png"],
  },
  icons: {
    icon: "/images/favicon.png",
  },
};

import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${playfair.variable} ${inter.variable}`}
    >
      <body className="h-full bg-background text-foreground font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
