import type { Metadata } from "next";
import { Heebo, Manrope } from "next/font/google";
import NavigationProgress from "@/components/NavigationProgress";
import { dirOf } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { dictionaries, getLocale } from "@/lib/i18n/server";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Hebrew text uses Heebo (it also carries Latin letters, so mixed lines look even)
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Blumea",
    description:
      locale === "he"
        ? "מודיעין תוכן לרשתות החברתיות, ליוצרים. התוכן שלך. התובנות שלנו. הצמיחה שלך."
        : "Social content intelligence for creators. Your content. Our insight. Your growth.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${manrope.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dict={dictionaries[locale]}>
          <NavigationProgress />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
