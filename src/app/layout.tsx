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
    <html lang="id" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html { background: #0C1410; color: #F0F5ED; }
          body { background: #0C1410; color: #F0F5ED; font-family: 'Inter', system-ui, sans-serif; }
        `}} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body text-on-surface min-h-full flex flex-col select-none overflow-x-hidden" style={{ background: "#0C1410", color: "#F0F5ED" }}>
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          duration={3000}
          toastOptions={{
            style: {
              background: "#182420",
              border: "1px solid rgba(91, 219, 111, 0.12)",
              color: "#F0F5ED",
            },
          }}
        />
      </body>
    </html>
  );
}
