const injectedFlag = '__doubao_preinject__';
const anyWindow = window as unknown as Record<string, unknown>;

if (!anyWindow[injectedFlag]) {
  anyWindow[injectedFlag] = true;

  try {
    const styleId = 'doubao-preinject-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none !important;
  width: 0px !important;
  height: 0px !important;
}
body {
  --extension-color-bg: #ffffff;
  --extension-color: rgba(0,0,0,0.55);
}
@media (prefers-color-scheme: dark) {
  body {
    --extension-color-bg: #232629;
    --extension-color: #ffffff;
  }
}
      `.trim();
      (document.documentElement || document.head).appendChild(style);
    }
  } catch (error) {
    console.warn('[Doubao Preinject] Failed to inject style:', error);
  }
}
