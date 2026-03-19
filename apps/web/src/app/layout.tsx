import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EngPlatform — Structural & Geotechnical Engineering',
  description: 'Multi-tenant SaaS platform for Australian structural and geotechnical engineering',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
