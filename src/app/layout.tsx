import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "HiMeal - Good Food, Good Mood",
  description:
    "Healthy food delivery in Purwokerto. Grilled chicken salad & kebab for the health-conscious.",
  openGraph: {
    title: "HiMeal - Good Food, Good Mood",
    description:
      "Healthy food delivery in Purwokerto. Order grilled chicken salad & kebab online.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ ["--font-headline" as string]: "'Manrope', sans-serif" }}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          duration={3000}
          toastOptions={{
            style: {
              background: "#111a11",
              border: "1px solid #1e3a1e",
              color: "#e8ede8",
            },
          }}
        />
      </body>
    </html>
  );
}
