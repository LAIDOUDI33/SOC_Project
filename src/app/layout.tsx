import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "National SOC Platform | Djezzy Security Operations Center",
  description: "Enterprise Security Operations Center platform for threat detection, incident response, and telecom security monitoring. Built for Djezzy Algeria national infrastructure protection.",
  keywords: ["SOC", "Security Operations Center", "Djezzy", "Cybersecurity", "Threat Detection", "Incident Response", "SS7", "Telecom Security", "National Infrastructure", "ANRT", "ARTP"],
  authors: [{ name: "Djezzy SOC Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "National SOC Platform - Djezzy",
    description: "Enterprise Security Operations Center for telecommunications infrastructure protection",
    siteName: "Djezzy SOC Platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "National SOC Platform",
    description: "Djezzy Security Operations Center - Protecting National Telecom Infrastructure",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
