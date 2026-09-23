import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "Solstice — Sun path",
  description:
    "Interactive 3D view of the sun’s daily and seasonal path over any latitude and longitude.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} ${caveat.variable} dark h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#07080d] text-[#f3efe6]">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
