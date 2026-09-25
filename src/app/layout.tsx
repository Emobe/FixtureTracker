import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { SubmitFixtureButton } from "@/components/SubmitFixtureButton";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sports Fixtures",
  description:
    "Fixtures and results for GAA Football & Hurling, Rugby League, Roller Derby, and grassroots club sports.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 pb-24 md:pb-10">
          {children}
        </main>
        <SubmitFixtureButton />
        <BottomNav />
      </body>
    </html>
  );
}
