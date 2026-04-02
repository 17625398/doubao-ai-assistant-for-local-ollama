/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    serverActions: {},
  },
  async redirects() {
    return [
      { source: '/ai-views/common-popup-webview-ai-tool-box', destination: '/?panel=quick-tools', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-speech-panel', destination: '/?panel=voice-chat', permanent: false },
      { source: '/ai-views/common-popup-webview-translate-panel', destination: '/?panel=translation', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-guide/read', destination: '/document-processing', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-guide/search', destination: '/?panel=quick-tools', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-guide/speech', destination: '/?panel=voice-chat', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-guide/translate', destination: '/?panel=translation', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-guide/video', destination: '/?panel=screen-share', permanent: false },
      { source: '/ai-views/common-popup-webview-ai-guide/:path*', destination: '/?panel=quick-tools', permanent: false },
      { source: '/notice/upgrade', destination: '/?panel=settings', permanent: false },
      { source: '/chat', destination: '/', permanent: false },
      { source: '/bookmark', destination: '/?panel=bookmark', permanent: false },
      { source: '/settings', destination: '/?panel=settings', permanent: false },
      { source: '/voice-chat', destination: '/?panel=voice-chat', permanent: false },
      { source: '/audio-translate', destination: '/?panel=audio-translate', permanent: false },
      { source: '/translate', destination: '/?panel=translation', permanent: false },
      { source: '/screen-share', destination: '/?panel=screen-share', permanent: false },
      { source: '/common-prompt', destination: '/?panel=quick-tools', permanent: false },
      { source: '/launcher', destination: '/new-tab', permanent: false },
      { source: '/redirect', destination: '/', permanent: false },
      { source: '/text-picker', destination: '/', permanent: false },
      { source: '/audio-capture', destination: '/?panel=voice-chat', permanent: false },
      { source: '/global-asr', destination: '/?panel=voice-chat', permanent: false },
    ];
  },
};

module.exports = nextConfig;
