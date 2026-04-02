import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <title>豆包 - 新标签页</title>
        <meta name="description" content="豆包AI助手 - 新标签页" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-white">
        {children}
      </body>
    </html>
  );
}
