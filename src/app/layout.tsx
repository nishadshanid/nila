import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: { default: "Nila", template: "%s · Nila" },
  description: "Our shared space for chores, plans, reminders and shopping.",
  applicationName: "Nila",
  appleWebApp: { capable: true, title: "Nila", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The browser bar matches the app: logo cream in light mode, near-black in dark.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaed" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // next-themes sets the theme class before React loads.
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
