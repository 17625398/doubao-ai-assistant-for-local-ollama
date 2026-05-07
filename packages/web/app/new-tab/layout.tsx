import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '豆包 - 新标签页',
  description: '豆包AI助手 - 新标签页',
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">{children}</div>;
}
