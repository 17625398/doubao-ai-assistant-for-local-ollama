const path = require('path')
const webpack = require('webpack')
const fs = require('fs')

const isDev = process.env.NODE_ENV !== 'production'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.0.32:11434'
const OLLAMA_ORIGIN = OLLAMA_BASE_URL.match(/^https?:\/\/[^/]+/)?.[0] || ''

const pdfjsDistPath = path.resolve(__dirname, '../node_modules/pdfjs-dist')
const pdfjsCmapsSrc = path.join(pdfjsDistPath, 'cmaps')
const pdfjsFontsSrc = path.join(pdfjsDistPath, 'standard_fonts')
const pdfjsPublicDest = path.join(__dirname, 'public/node_modules/pdfjs-dist')

if (process.env.NODE_ENV !== 'test') {
  try {
    if (fs.existsSync(pdfjsCmapsSrc)) {
      const destCmaps = path.join(pdfjsPublicDest, 'cmaps')
      if (!fs.existsSync(destCmaps)) {
        fs.mkdirSync(destCmaps, { recursive: true })
        fs.readdirSync(pdfjsCmapsSrc).forEach(file => {
          fs.copyFileSync(path.join(pdfjsCmapsSrc, file), path.join(destCmaps, file))
        })
      }
    }
    if (fs.existsSync(pdfjsFontsSrc)) {
      const destFonts = path.join(pdfjsPublicDest, 'standard_fonts')
      if (!fs.existsSync(destFonts)) {
        fs.mkdirSync(destFonts, { recursive: true })
        fs.readdirSync(pdfjsFontsSrc).forEach(file => {
          fs.copyFileSync(path.join(pdfjsFontsSrc, file), path.join(destFonts, file))
        })
      }
    }
  } catch (e) {
    console.warn('[next.config] Failed to copy pdfjs-dist assets:', e.message)
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    'chromadb',
    'playwright',
    'pyodide',
    'tesseract.js',
    'page-agent',
    'pdfjs-dist',
    '@napi-rs/canvas',
  ],
  transpilePackages: ['@ai-intelligent-analysis-platform/core', '@core'],
  allowedDevOrigins: isDev ? ['http://127.0.0.1:3000', 'http://localhost:3000', '127.0.0.1', 'localhost'] : undefined,
  experimental: {
    serverActions: {
      allowedOrigins: isDev ? ['*'] : undefined,
    },
    optimizePackageImports: ['lucide-react'],
    scrollRestoration: true,
    // 强制使用 webpack 而不是 turbopack
    turbo: false,
  },
  turbopack: {},

  async headers() {
    return [
      {
        source: '/__nextjs_font/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              `connect-src 'self' https: ws: wss: ${OLLAMA_ORIGIN} http://localhost:11434 http://127.0.0.1:11434 https://cdn.jsdelivr.net`,
              "font-src 'self' data: https://cdn.jsdelivr.net",
              "media-src 'self' blob:",
              "worker-src 'self' blob: https://cdn.jsdelivr.net",
            ].join('; '),
          },
        ],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      '@core': path.resolve(__dirname, '../core/src'),
      '@ai-intelligent-analysis-platform/core': path.resolve(__dirname, '../core/src'),
      '@doubao/core': path.resolve(__dirname, '../core/src'),
    }

    config.module.rules.push({
      test: /node_modules\/pdfjs-dist\/.*\.mjs$/,
      resolve: {
        fullySpecified: false,
      },
    })

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        os: false,
        async_hooks: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
        util: false,
        stream: false,
        url: false,
        buffer: false,
        process: false,
      }
      // 确保 core 包中的 Node.js 模块被正确排除
      config.plugins = config.plugins || []
      // 只替换明确的 Node.js 模块，不影响其他
      const nodeModulesToShim = ['fs', 'child_process', 'path', 'os', 'util', 'http', 'https', 'net', 'tls', 'zlib', 'async_hooks', 'url', 'buffer', 'process', 'stream'];
      nodeModulesToShim.forEach(mod => {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(new RegExp(`^${mod}$`), resource => {
            resource.request = require.resolve('./pyodide-shim.js')
          })
        );
      });
      // 移除过于宽泛的 pyodide 替换规则，避免影响 pyodideService.ts
    }

    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
      minimize: true,
      sideEffects: false,
    }

    return config
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
      { source: '/ai-views', destination: '/?panel=quick-tools', permanent: false },
      { source: '/notice/upgrade', destination: '/?panel=settings', permanent: false },
      { source: '/chat', destination: '/', permanent: false },
      { source: '/client', destination: '/', permanent: false },
      { source: '/bookmark', destination: '/?panel=bookmark', permanent: false },
      { source: '/settings', destination: '/?panel=settings', permanent: false },
      { source: '/voice-chat', destination: '/?panel=voice-chat', permanent: false },
      { source: '/audio-translate', destination: '/?panel=audio-translate', permanent: false },
      { source: '/translate', destination: '/?panel=translation', permanent: false },
      { source: '/screen-share', destination: '/?panel=screen-share', permanent: false },
      { source: '/common-prompt', destination: '/?panel=quick-tools', permanent: false },
      { source: '/launcher', destination: '/new-tab', permanent: false },
      { source: '/background', destination: '/', permanent: false },
      { source: '/redirect', destination: '/', permanent: false },
      { source: '/text-picker', destination: '/', permanent: false },
      { source: '/audio-capture', destination: '/?panel=voice-chat', permanent: false },
      { source: '/global-asr', destination: '/?panel=voice-chat', permanent: false },
      { source: '/saman-notify', destination: '/', permanent: false },
    ]
  },
}

module.exports = nextConfig
