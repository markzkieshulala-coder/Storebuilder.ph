import type { Metadata } from "next";
import { Playfair_Display, Syne, Bricolage_Grotesque, DM_Serif_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Storebuilder.ph — Build your website with AI",
    template: "%s | Storebuilder.ph",
  },
  description:
    "The first AI-powered website builder made for the Philippines 🇵🇭. Type a prompt, get a complete website instantly. No coding required.",
  keywords: [
    "website builder",
    "AI website builder",
    "Philippines",
    "online store",
    "business website",
    "portfolio",
  ],
  authors: [{ name: "Storebuilder.ph" }],
  creator: "Storebuilder.ph",
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://storebuilder.ph",
    title: "Storebuilder.ph — Build your website with AI",
    description:
      "The first AI-powered website builder made for the Philippines 🇵🇭. Type a prompt, get a complete website instantly.",
    siteName: "Storebuilder.ph",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Storebuilder.ph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Storebuilder.ph — Build your website with AI",
    description:
      "The first AI-powered website builder made for the Philippines 🇵🇭",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${syne.variable} ${bricolage.variable} ${dmSerif.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1a1a2e",
              color: "#fff",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "12px",
            },
            success: {
              iconTheme: {
                primary: "#8b5cf6",
                secondary: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
