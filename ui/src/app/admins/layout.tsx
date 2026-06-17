import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Admins",
};

export default function AdminsLayout({ children }: { children: ReactNode }) {
  return children;
}
