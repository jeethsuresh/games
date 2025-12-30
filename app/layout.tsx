import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puzzle Games",
  description: "A collection of word and number puzzle games",
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

