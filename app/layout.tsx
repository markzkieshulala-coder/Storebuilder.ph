import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://storebuilder.ph"),
  title: {
    default: "Storebuilder.ph — #1 Online Store Builder Philippines | Gawa ng AI",
    template: "%s | Storebuilder.ph",
  },
  description:
    "Ang pinaka-madaling paraan para gumawa ng website sa Pilipinas. I-type lang ang iyong negosyo, makakuha ng magandang website sa loob ng ilang segundo. Libreng gamitin — walang coding. The #1 AI website builder for Filipino entrepreneurs.",
  keywords: [
    "online store builder Philippines",
    "website builder Philippines",
    "AI website builder Philippines",
    "AI website builder para sa Pilipino",
    "libreng website builder Philippines",
    "gawa ng website Philippines",
    "online store Philippines",
    "ecommerce Philippines",
    "website para sa negosyo",
    "free website builder Philippines",
    "business website Philippines",
    "Filipino website builder",
    "Storebuilder Philippines",
    "website builder Pilipinas",
    "AI store builder PH",
  ],
  authors: [{ name: "Mark Ocdenaria", url: "https://storebuilder.ph" }],
  creator: "Storebuilder.ph",
  publisher: "Storebuilder.ph",
  alternates: {
    canonical: "https://storebuilder.ph",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://storebuilder.ph",
    title: "Storebuilder.ph — #1 Online Store Builder Philippines",
    description:
      "Gumawa ng magandang website para sa iyong negosyo sa ilang segundo gamit ang AI. Libre para sa lahat ng Pilipino. No coding required.",
    siteName: "Storebuilder.ph",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Storebuilder.ph — AI Website Builder Philippines",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Storebuilder.ph — #1 Online Store Builder Philippines",
    description:
      "Gumawa ng magandang website para sa iyong negosyo sa ilang segundo. Libre. No coding.",
    images: ["/og-image.png"],
    creator: "@storebuildersph",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "storebuilder-ph-google-verify",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-PH" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Storebuilder.ph",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://storebuilder.ph",
              description:
                "AI-powered website builder for Filipino entrepreneurs. Build a professional website in seconds — no coding required.",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "PHP",
                  name: "Free Plan",
                },
                {
                  "@type": "Offer",
                  price: "999",
                  priceCurrency: "PHP",
                  name: "Pro Monthly",
                  billingDuration: "P1M",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "128",
              },
              author: {
                "@type": "Organization",
                name: "Storebuilder.ph",
                founder: { "@type": "Person", name: "Mark Ocdenaria" },
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "PH",
                  addressRegion: "Philippines",
                },
              },
            }),
          }}
        />
      </head>
      <body className="antialiased bg-white text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#fff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            },
            success: {
              iconTheme: { primary: "#1877F2", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
