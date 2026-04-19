import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

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
    <html lang="id" className="dark h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body text-on-surface min-h-full flex flex-col select-none overflow-x-hidden">
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          duration={3000}
          toastOptions={{
            style: {
              background: "#111a11",
              border: "1px solid rgba(74, 124, 89, 0.2)",
              color: "#dfe4db",
            },
          }}
        />
      </body>
    </html>
  );
}
