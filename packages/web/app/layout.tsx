import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { I18nProvider } from '@/contexts/I18nContext';
import { SkillProvider } from '@/contexts/SkillContext';
import { ChatProvider, UIProvider } from '@/contexts';
import { PdfJsProvider } from '@/components/PdfJsProvider';

export const metadata: Metadata = {
  title: '豆包 - 你的AI助手',
  description: '豆包是你的 AI 聊天智能对话问答助手，写作文案翻译编程全能工具。豆包为你答疑解惑，提供灵感，辅助创作，也可以和你畅聊任何你感兴趣的话题。',
  keywords: '豆包,AI对话,AI聊天,AI写作,AIGC,AI,AI图片生成',
  openGraph: {
    title: '豆包',
    description: '豆包是你的 AI 聊天智能对话问答助手',
    type: 'website',
    url: 'www.doubao.com',
    images: ['https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/logo_new.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ErrorBoundary>
          <I18nProvider>
            <SkillProvider>
              <PdfJsProvider>
                <UIProvider>
                  <ChatProvider>
                    {children}
                  </ChatProvider>
                </UIProvider>
              </PdfJsProvider>
            </SkillProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
