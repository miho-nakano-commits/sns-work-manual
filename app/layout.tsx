import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNSお仕事マニュアル",
  description: "順番に進めれば、初めてでもSNSのお仕事ができる体験型Webマニュアル",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
