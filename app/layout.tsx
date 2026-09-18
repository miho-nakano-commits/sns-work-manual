import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNSお仕事マニュアル",
  description: "はじめてのSNS運用を体験しながら学べる、お仕事用Webマニュアル",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "SNSお仕事マニュアル",
    description: "6つのクエストを進めながら、SNSのお仕事を身につけよう。",
    images: ["https://sns-work-manual.salespass-2057.chatgpt.site/sns-quest-hero.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
