import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

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
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
