/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision?: string }>;
};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const handler = async () => {
  const response = await fetch('/index.html');
  return response;
};

const navigationRoute = new NavigationRoute(handler, {
  // @ts-expect-error
  denyList: [/^\/api\//],
});

registerRoute(navigationRoute);

registerRoute(
  // @ts-ignore
  ({ request, url }) =>
    url.origin === self.location.origin &&
    request &&
    request.destination &&
    ['style', 'script', 'worker', 'font', 'image'].includes(request.destination) &&
    url.pathname !== '/runtime-config.js',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
  }),
);

registerRoute(
  ({ url }) => url.origin === self.location.origin && (url.pathname === '/runtime-config.js' || url.pathname.startsWith('/api/')),
  new NetworkOnly(),
);
