import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MainShell from "@/components/MainShell";
import AuthProvider from "@/components/AuthProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SidebarProvider } from "@/contexts/SidebarContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sanctum-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sanctum-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sanctum-mono",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://sanctum.craftxlogic.com";

const SITE_TITLE = "Sanctum — SSH access management for teams";
const SITE_DESCRIPTION =
  "Manage SSH users, keys, and sudo across server environments from one dashboard. Pull-based provisioning with no agent on hosts.";
const OG_IMAGE = "/og/sanctum.png";
const FAVICON_ICONS = [
  { url: "/favicon-196x196.png", sizes: "196x196", type: "image/png" },
  { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
  { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
  { url: "/favicon-128.png", sizes: "128x128", type: "image/png" },
];
const APPLE_TOUCH_ICONS = [
  { url: "/apple-touch-icon-57x57.png", sizes: "57x57" },
  { url: "/apple-touch-icon-114x114.png", sizes: "114x114" },
  { url: "/apple-touch-icon-72x72.png", sizes: "72x72" },
  { url: "/apple-touch-icon-144x144.png", sizes: "144x144" },
  { url: "/apple-touch-icon-60x60.png", sizes: "60x60" },
  { url: "/apple-touch-icon-120x120.png", sizes: "120x120" },
  { url: "/apple-touch-icon-76x76.png", sizes: "76x76" },
  { url: "/apple-touch-icon-152x152.png", sizes: "152x152" },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s - Sanctum",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Sanctum",
  icons: {
    icon: FAVICON_ICONS,
    apple: APPLE_TOUCH_ICONS,
  },
  other: {
    "msapplication-TileColor": "#FFFFFF",
    "msapplication-TileImage": "/mstile-144x144.png",
    "msapplication-square70x70logo": "/mstile-70x70.png",
    "msapplication-square150x150logo": "/mstile-150x150.png",
    "msapplication-wide310x150logo": "/mstile-310x150.png",
    "msapplication-square310x310logo": "/mstile-310x310.png",
  },
  keywords: [
    "SSH key management",
    "SSH access control",
    "server access",
    "team access",
    "provisioning",
    "DevOps",
    "infrastructure",
    "Sanctum",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Sanctum",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
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
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-sanctum-bg font-sans text-sanctum-mist">
        <AuthProvider>
          <WorkspaceProvider>
            <SidebarProvider>
              <Sidebar />
              <MainShell>{children}</MainShell>
              <BottomNav />
            </SidebarProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
