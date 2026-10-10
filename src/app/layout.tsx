import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import NavigationProgress from "@/components/NavigationProgress";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blumea",
  description:
    "Social content intelligence for creators. Your content. Our insight. Your growth.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
