import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

// Remembers the language the person picked (the switch calls this, then refreshes the page).
export async function POST(request: Request) {
  const { locale } = (await request.json().catch(() => ({}))) as { locale?: unknown };
  if (!isLocale(locale)) return NextResponse.json({ error: "unknown language" }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}
