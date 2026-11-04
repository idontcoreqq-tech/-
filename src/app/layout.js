import { Inter, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
});

const inter = Inter({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Кромка — барбершоп на Вайнера",
  description: "Запись к барберу: стрижка, борода, машинка. Слот на сайте или в Telegram.",
};

export default async function RootLayout({ children }) {
  const jar = await cookies();
  const theme = jar.get("kromka-theme")?.value;
  const isDark = theme !== "light";

  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${inter.variable} h-full antialiased${isDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
