import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MainShell from "@/components/MainShell";
import AuthProvider from "@/components/AuthProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SidebarProvider } from "@/contexts/SidebarContext";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sanctum-logo",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://sanctum.craftxlogic.com";

const SITE_TITLE = "SANCTUM — SSH key distribution for teams";
const SITE_DESCRIPTION =
  "Secure SSH access orchestration for your teams and environments: distribute keys, manage assignments, and keep servers converged with what you define in one place.";
const OG_IMAGE = "/og/sanctum.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · SANCTUM",
  },
  description: SITE_DESCRIPTION,
  applicationName: "SANCTUM",
  keywords: [
    "SSH key management",
    "SSH access control",
    "server access",
    "team access",
    "provisioning",
    "DevOps",
    "infrastructure",
    "SANCTUM",
    "Craft and Logic",
  ],
  authors: [
    { name: "Craft and Logic, Inc.", url: "https://craftxlogic.com" },
  ],
  creator: "Craft and Logic, Inc.",
  publisher: "Craft and Logic, Inc.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "SANCTUM",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "SANCTUM — SSH key distribution for teams",
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
    <html lang="en" className={shareTechMono.variable}>
      <body className="min-h-screen bg-sanctum-ink font-sans text-sanctum-mist">
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
