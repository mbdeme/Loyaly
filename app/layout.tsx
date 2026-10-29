
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppNavigation from "@/app/components/AppNavigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Localy - Gestion locative",
  description: "Gérez vos biens, logements, baux et paiements locatifs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppNavigation>{children}</AppNavigation>
      </body>
    </html>
  );
}
