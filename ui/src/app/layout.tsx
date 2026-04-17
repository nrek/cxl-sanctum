import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MobileTopBar from "@/components/MobileTopBar";
import MainShell from "@/components/MainShell";
import AuthProvider from "@/components/AuthProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sanctum-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SANCTUM",
  description: "SSH key distribution manager",
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
            <Sidebar />
            <MobileTopBar />
            <MainShell>{children}</MainShell>
            <BottomNav />
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
