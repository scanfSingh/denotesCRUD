import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "@/styles/globals.css";
import Providers from "./providers";

const instrumentSans = Instrument_Sans({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const siteConfig = {
  name: "denotes",
  title: "denotes - Intelligent Note-Taking & Knowledge Management",
  description: "Capture ideas with voice, organize thoughts hierarchically, and collaborate seamlessly. denotes is your AI-powered workspace for notes, tasks, and knowledge building.",
  url: "https://denotes.co.in",
  ogImage: "/og-image.png",
  keywords: [
    "note-taking app",
    "knowledge management",
    "voice notes",
    "audio transcription",
    "task management",
    "collaborative notes",
    "AI notes",
    "productivity app",
    "personal knowledge base",
    "topic organization",
    "smart notes",
    "team collaboration",
  ],
  authors: [{ name: "denotes" }],
  creator: "denotes",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "denotes - Your Intelligent Note-Taking Platform",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@denotes", // Update with your Twitter handle
  },

  // Icons - Next.js automatically uses favicon.ico, icon.svg, and apple-icon.svg from app folder
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },

  // Manifest
  manifest: "/manifest.json",

  // App-specific
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.name,
  },
  
  // Verification (add your verification codes)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },

  // Alternates
  alternates: {
    canonical: siteConfig.url,
  },

  // Category
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// JSON-LD structured data for rich search results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Voice-to-text transcription",
    "Hierarchical topic organization",
    "Collaborative sharing",
    "Rich text editing",
    "Task management",
    "AI-powered summaries",
  ],
  screenshot: siteConfig.ogImage,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={instrumentSans.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
