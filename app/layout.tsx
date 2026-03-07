import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rakurakukku-ai-2026.vercel.app/"),

  title: "ラクラクックAI｜忙しい主婦のための時短献立・レシピ提案アプリ",

  description:
    "ラクラクックAIは、忙しい主婦や共働き家庭向けに、時短で作れる献立やレシピをAIが提案するアプリです。朝・昼・夜に合わせた献立提案、買い物リスト、チェックリスト機能つき。",

  keywords: [
    "献立",
    "献立アプリ",
    "レシピ",
    "時短レシピ",
    "主婦",
    "共働き",
    "晩ごはん",
    "朝ごはん",
    "昼ごはん",
    "買い物リスト",
    "AIレシピ",
  ],

  openGraph: {
    title: "ラクラクックAI｜忙しい主婦のための時短献立・レシピ提案アプリ",
    description:
      "朝・昼・夜に合わせた献立をAIが提案。買い物リストやチェック機能つきで、毎日のごはん作りをラクにします。",
    url: "https://rakurakukku-ai-2026.vercel.app/",
    siteName: "ラクラクックAI",
    locale: "ja_JP",
    type: "website",

    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ラクラクックAI｜AIが1週間の献立を作ります",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ラクラクックAI｜忙しい主婦のための時短献立・レシピ提案アプリ",
    description:
      "時短レシピ・献立提案・買い物リストまで対応。忙しい毎日のごはん作りをAIでラクに。",
    images: ["/og.png"],
  },

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
