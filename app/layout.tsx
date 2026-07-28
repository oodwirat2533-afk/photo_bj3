import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Media ERP",
  description: "ระบบติดตามบุตรหลาน ภาพและวิดีโอจาก Google Drive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
