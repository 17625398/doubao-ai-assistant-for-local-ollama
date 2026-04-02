/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!********************************!*\
  !*** ./src/preinject/index.ts ***!
  \********************************/

const injectedFlag = '__doubao_preinject__';
const anyWindow = window;
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
    }
    catch (error) {
        console.warn('[Doubao Preinject] Failed to inject style:', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJlaW5qZWN0L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFNLFlBQVksR0FBRyxzQkFBc0IsQ0FBQztBQUM1QyxNQUFNLFNBQVMsR0FBRyxNQUE0QyxDQUFDO0FBRS9ELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztJQUM3QixTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRS9CLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLHdCQUF3QixDQUFDO1FBQ3pDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QyxLQUFLLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUNuQixLQUFLLENBQUMsV0FBVyxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7OztPQWlCbkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNULENBQUMsUUFBUSxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pFLENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBpbmplY3RlZEZsYWcgPSAnX19kb3ViYW9fcHJlaW5qZWN0X18nO1xuY29uc3QgYW55V2luZG93ID0gd2luZG93IGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbmlmICghYW55V2luZG93W2luamVjdGVkRmxhZ10pIHtcbiAgYW55V2luZG93W2luamVjdGVkRmxhZ10gPSB0cnVlO1xuXG4gIHRyeSB7XG4gICAgY29uc3Qgc3R5bGVJZCA9ICdkb3ViYW8tcHJlaW5qZWN0LXN0eWxlJztcbiAgICBpZiAoIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHN0eWxlSWQpKSB7XG4gICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICBzdHlsZS5pZCA9IHN0eWxlSWQ7XG4gICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbmh0bWw6Oi13ZWJraXQtc2Nyb2xsYmFyLFxuYm9keTo6LXdlYmtpdC1zY3JvbGxiYXIge1xuICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XG4gIHdpZHRoOiAwcHggIWltcG9ydGFudDtcbiAgaGVpZ2h0OiAwcHggIWltcG9ydGFudDtcbn1cbmJvZHkge1xuICAtLWV4dGVuc2lvbi1jb2xvci1iZzogI2ZmZmZmZjtcbiAgLS1leHRlbnNpb24tY29sb3I6IHJnYmEoMCwwLDAsMC41NSk7XG59XG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG4gIGJvZHkge1xuICAgIC0tZXh0ZW5zaW9uLWNvbG9yLWJnOiAjMjMyNjI5O1xuICAgIC0tZXh0ZW5zaW9uLWNvbG9yOiAjZmZmZmZmO1xuICB9XG59XG4gICAgICBgLnRyaW0oKTtcbiAgICAgIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgfHwgZG9jdW1lbnQuaGVhZCkuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tEb3ViYW8gUHJlaW5qZWN0XSBGYWlsZWQgdG8gaW5qZWN0IHN0eWxlOicsIGVycm9yKTtcbiAgfVxufVxuIl19
/******/ })()
;
//# sourceMappingURL=preinject.js.map