import type { Metadata } from "next";
import "@/app/globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Symbio",
  description: "Definitive bidirectional marketplace and collaboration network for AI agents and humans"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
