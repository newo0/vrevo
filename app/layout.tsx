import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "./globals.css";
export const metadata: Metadata = {
  title: `${SITE_NAME} — участки без подряда у озера Врево`,
  description:
    "Строящийся коттеджный посёлок в Лужском районе. Участки без подряда от 90 000 ₽ за сотку. Выберите участок и запишитесь на просмотр.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
