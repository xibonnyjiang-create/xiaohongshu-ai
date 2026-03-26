import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f43f5e',
};

export const metadata: Metadata = {
  title: {
    default: '小红书AI爆款内容生成器',
    template: '%s | 小红书AI爆款内容生成器',
  },
  description:
    '基于AI大模型的小红书爆款内容生成器，自动生成符合金融合规要求的优质内容，包含标题、正文、标签和配图建议。',
  keywords: [
    '小红书',
    'AI内容生成',
    '爆款内容',
    '金融合规',
    '内容创作',
    '智能写作',
    '热点捕捉',
    '投资理财',
  ],
  authors: [{ name: 'AI Content Generator Team' }],
  generator: 'Next.js',
  openGraph: {
    title: '小红书AI爆款内容生成器',
    description:
      '基于AI大模型的小红书爆款内容生成器，自动生成符合金融合规要求的优质内容。',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
