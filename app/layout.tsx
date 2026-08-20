import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://playwell-class-bgm.rotmxm.chatgpt.site"),
  title: "PLAYWELL Class BGM",
  description:
    "수업의 분위기를 한 번의 터치로 바꿔요. 효과음은 바로 재생하고, 배경음은 플레이리스트로 이어서 들을 수 있는 플레이웰 수업 도구입니다.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://playwell-class-bgm.rotmxm.chatgpt.site",
    siteName: "PLAYWELL",
    title: "PLAYWELL Class BGM",
    description:
      "효과음은 한 번의 터치로, 배경음은 플레이리스트로 편리하게 재생해 보세요.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PLAYWELL Class BGM 웹앱 화면",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PLAYWELL Class BGM",
    description:
      "효과음은 한 번의 터치로, 배경음은 플레이리스트로 편리하게 재생해 보세요.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#067772",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
