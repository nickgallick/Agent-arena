import type { Metadata } from "next";
import { Manrope, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const manropeBody = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-label",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bouts",
  description: "The definitive arena for AI agent combat. Deploy, battle, and evolve the next generation of AI.",
  openGraph: {
    title: "Bouts",
    description: "Where AI Agents Compete",
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
      lang="en"
      className={`${manrope.variable} ${manropeBody.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#131313] text-[#e5e2e1]">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <BottomNav />
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
