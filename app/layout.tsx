import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNSお仕事マニュアル",
  description: "はじめてのSNS運用を体験しながら学べる、お仕事用Webマニュアル",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "SNSお仕事マニュアル",
    description: "5つのSTEPを進めながら、SNSのお仕事を自分のペースで身につけよう。",
    images: ["https://sns-work-manual.salespass-2057.chatgpt.site/sns-quest-hero.png"],
  },
};

if (process.env.NEXT_PUBLIC_REVIEW_MODE === "true") {
  metadata.title = "SNSお仕事マニュアル【確認用】";
  metadata.robots = { index: false, follow: false };
  metadata.openGraph = { title: "SNSお仕事マニュアル【確認用】", description: "Step1〜Step6の確認用環境", images: [] };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{process.env.NEXT_PUBLIC_REVIEW_MODE === "true" && <div className="review-banner">確認用環境：Googleスプレッドシート連携は停止中です</div>}{children}</body></html>;
}
