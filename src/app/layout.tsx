import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wsalhali — Premium Shipping & Logistics Platform",
  description: "Wsalhali is a modern shipping and logistics platform offering COD delivery, real-time tracking, branch transfers, and complete fleet management.",
  keywords: ["Wsalhali", "shipping", "logistics", "COD", "delivery", "courier", "Egypt"],
  authors: [{ name: "Wsalhali" }],
  icons: {
    icon: "/wsalhali-logo.png",
  },
  openGraph: {
    title: "Wsalhali — Premium Shipping & Logistics",
    description: "Modern COD shipping platform with real-time tracking and complete fleet management.",
    siteName: "Wsalhali",
    type: "website",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
