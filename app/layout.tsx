import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Modiji's assemble",
  description: "A fun browser-based game where Modi eats trees and avoids cockroaches!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
