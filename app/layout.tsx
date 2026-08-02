import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Toaster } from 'react-hot-toast';
import { ConfirmModalProvider } from './components/ConfirmModalProvider';

export const metadata: Metadata = {
  title: "คลังรูปโรงเรียนบรรหารแจ่มใสวิทยา 3",
  description: "ระบบติดตามบุตรหลาน ภาพและวิดีโอจาก Google Drive",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <ConfirmModalProvider>
          <Navbar />
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{ 
              style: { 
                borderRadius: 'var(--radius-lg)', 
                background: 'var(--color-surface)', 
                color: 'var(--color-text-main)',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-border)'
              } 
            }} 
          />
        </ConfirmModalProvider>
      </body>
    </html>
  );
}
