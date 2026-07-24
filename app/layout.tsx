import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daaman — Kashmiri for the conversations that matter",
  description: "A private, gentle Kashmiri and English conversation companion.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
