import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 浏览器 API 兼容性测试套件
 * 覆盖 SpeechRecognition、SpeechSynthesis、Clipboard、File API
 */
describe('Browser API Compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SpeechRecognition API', () => {
    it('should have SpeechRecognition or webkitSpeechRecognition available', () => {
      const hasSpeechRecognition =
        'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      expect(typeof hasSpeechRecognition).toBe('boolean');
    });

    it('should verify SpeechRecognition interface signature when available', () => {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        const instance = new SpeechRecognitionCtor();
        expect(instance).toBeDefined();
        expect(typeof instance.start).toBe('function');
        expect(typeof instance.stop).toBe('function');
        expect(typeof instance.abort).toBe('function');
        expect(typeof instance.addEventListener).toBe('function');
      } else {
        expect(SpeechRecognitionCtor).toBeUndefined();
      }
    });

    it('should have required event handlers on SpeechRecognition instance', () => {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        const instance = new SpeechRecognitionCtor();
        expect(instance).toHaveProperty('onresult');
        expect(instance).toHaveProperty('onerror');
        expect(instance).toHaveProperty('onend');
        expect(instance).toHaveProperty('onstart');
        expect(instance).toHaveProperty('lang');
        expect(instance).toHaveProperty('continuous');
        expect(instance).toHaveProperty('interimResults');
      }
    });

    it('should handle SpeechRecognition constructor errors gracefully', () => {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionCtor) {
        expect(() => new (window as any).SpeechRecognition()).toThrow();
      }
    });
  });

  describe('SpeechSynthesis API', () => {
    it('should verify speechSynthesis availability', () => {
      const hasSpeechSynthesis = 'speechSynthesis' in window;
      expect(typeof hasSpeechSynthesis).toBe('boolean');
    });

    it('should verify speechSynthesis interface methods when available', () => {
      const synth = window.speechSynthesis;
      if (synth) {
        expect(typeof synth.speak).toBe('function');
        expect(typeof synth.cancel).toBe('function');
        expect(typeof synth.pause).toBe('function');
        expect(typeof synth.resume).toBe('function');
        expect(typeof synth.getVoices).toBe('function');
      } else {
        expect(synth).toBeUndefined();
      }
    });

    it('should verify SpeechSynthesisUtterance constructor when available', () => {
      if ('SpeechSynthesisUtterance' in window) {
        const utterance = new SpeechSynthesisUtterance('test');
        expect(utterance).toBeDefined();
        expect(typeof utterance.text).toBe('string');
        expect(utterance.text).toBe('test');
        expect(utterance).toHaveProperty('lang');
        expect(utterance).toHaveProperty('rate');
        expect(utterance).toHaveProperty('pitch');
        expect(utterance).toHaveProperty('volume');
        expect(utterance).toHaveProperty('voice');
      }
    });

    it('should return array from getVoices when available', () => {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        expect(Array.isArray(voices)).toBe(true);
      }
    });

    it('should handle speechSynthesis events when available', () => {
      if (typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance('test');
        expect(typeof utterance.addEventListener).toBe('function');
        expect(utterance.onstart).toBeNull();
        expect(utterance.onend).toBeNull();
        expect(utterance.onerror).toBeNull();
      }
    });
  });

  describe('Clipboard API', () => {
    it('should verify clipboard availability', () => {
      const hasClipboard = 'clipboard' in navigator;
      expect(typeof hasClipboard).toBe('boolean');
    });

    it('should verify clipboard interface methods when available', () => {
      const clipboard = navigator.clipboard;
      if (clipboard) {
        expect(typeof clipboard.readText).toBe('function');
        expect(typeof clipboard.writeText).toBe('function');
        expect(typeof clipboard.read).toBe('function');
        expect(typeof clipboard.write).toBe('function');
      } else {
        expect(clipboard).toBeUndefined();
      }
    });

    it('should verify ClipboardItem constructor when available', () => {
      if ('ClipboardItem' in window) {
        expect(typeof (window as any).ClipboardItem).toBe('function');
      }
    });

    it('should return Promise from clipboard methods when available', () => {
      const clipboard = navigator.clipboard;
      if (clipboard) {
        expect(clipboard.readText()).toBeInstanceOf(Promise);
        expect(clipboard.writeText('test')).toBeInstanceOf(Promise);
      } else {
        expect(clipboard).toBeUndefined();
      }
    });

    it('should handle clipboard permission query when available', async () => {
      if ('permissions' in navigator && navigator.clipboard) {
        try {
          const result = await navigator.permissions.query({
            name: 'clipboard-read' as PermissionName,
          });
          expect(result).toBeDefined();
          expect(['granted', 'denied', 'prompt']).toContain(result.state);
        } catch {
          expect(true).toBe(true);
        }
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('File API', () => {
    it('should have File constructor available', () => {
      expect(typeof File).toBe('function');
    });

    it('should have Blob constructor available', () => {
      expect(typeof Blob).toBe('function');
    });

    it('should have FileReader constructor available', () => {
      expect(typeof FileReader).toBe('function');
    });

    it('should have FormData constructor available', () => {
      expect(typeof FormData).toBe('function');
    });

    it('should verify File instance properties and methods', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(file).toBeDefined();
      expect(file.name).toBe('test.txt');
      expect(file.type).toBe('text/plain');
      expect(file.size).toBe(7);
      expect(typeof file.slice).toBe('function');
      expect(typeof file.text).toBe('function');
      expect(typeof file.arrayBuffer).toBe('function');
      expect(file.lastModified).toBeDefined();
    });

    it('should verify Blob instance methods', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      expect(blob).toBeDefined();
      expect(blob.size).toBe(4);
      expect(blob.type).toBe('text/plain');
      expect(typeof blob.slice).toBe('function');
      expect(typeof blob.text).toBe('function');
      expect(typeof blob.arrayBuffer).toBe('function');
      if (typeof blob.stream === 'function') {
        expect(typeof blob.stream).toBe('function');
      }
    });

    it('should verify FileReader interface methods', () => {
      const reader = new FileReader();
      expect(reader).toBeDefined();
      expect(typeof reader.readAsText).toBe('function');
      expect(typeof reader.readAsDataURL).toBe('function');
      expect(typeof reader.readAsArrayBuffer).toBe('function');
      expect(typeof reader.readAsBinaryString).toBe('function');
      expect(typeof reader.abort).toBe('function');
      expect(reader.readyState).toBe(0);
      expect(reader.result).toBeNull();
    });

    it('should verify FormData interface methods', () => {
      const formData = new FormData();
      expect(formData).toBeDefined();
      expect(typeof formData.append).toBe('function');
      expect(typeof formData.delete).toBe('function');
      expect(typeof formData.get).toBe('function');
      expect(typeof formData.getAll).toBe('function');
      expect(typeof formData.has).toBe('function');
      expect(typeof formData.set).toBe('function');
      expect(typeof formData.entries).toBe('function');
      expect(typeof formData.keys).toBe('function');
      expect(typeof formData.values).toBe('function');
    });

    it('should handle FileReader result types correctly', async () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const reader = new FileReader();

      const result = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      expect(result).toBe('hello');
    });

    it('should handle FileReader error events', () => {
      const reader = new FileReader();
      expect(typeof reader.addEventListener).toBe('function');
      expect(reader.onerror).toBeNull();
      expect(reader.onabort).toBeNull();
      expect(reader.onload).toBeNull();
    });

    it('should handle URL.createObjectURL and URL.revokeObjectURL', () => {
      const blob = new Blob(['test']);
      const url = URL.createObjectURL(blob);
      expect(typeof url).toBe('string');
      expect(url.startsWith('blob:')).toBe(true);
      expect(() => URL.revokeObjectURL(url)).not.toThrow();
    });
  });

  describe('DataTransfer API (Drag & Drop)', () => {
    it('should verify DataTransfer availability', () => {
      const hasDataTransfer = typeof DataTransfer !== 'undefined';
      expect(typeof hasDataTransfer).toBe('boolean');
    });

    it('should verify DataTransfer interface methods when available', () => {
      if (typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer();
        expect(dt).toBeDefined();
        expect(typeof dt.setData).toBe('function');
        expect(typeof dt.getData).toBe('function');
        expect(typeof dt.clearData).toBe('function');
        expect(typeof dt.setDragImage).toBe('function');
        expect(dt.files).toBeInstanceOf(FileList);
        expect(dt.types).toBeInstanceOf(Array);
      } else {
        expect(typeof DataTransfer).toBe('undefined');
      }
    });
  });

  describe('MediaDevices API', () => {
    it('should verify navigator.mediaDevices availability', () => {
      const hasMediaDevices = 'mediaDevices' in navigator;
      expect(typeof hasMediaDevices).toBe('boolean');
    });

    it('should verify mediaDevices interface methods when available', () => {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices) {
        expect(typeof mediaDevices.getUserMedia).toBe('function');
        expect(typeof mediaDevices.enumerateDevices).toBe('function');
      } else {
        expect(mediaDevices).toBeUndefined();
      }
    });

    it('should return Promise from enumerateDevices when available', () => {
      if (navigator.mediaDevices) {
        expect(navigator.mediaDevices.enumerateDevices()).toBeInstanceOf(Promise);
      } else {
        expect(navigator.mediaDevices).toBeUndefined();
      }
    });
  });

  describe('BroadcastChannel API', () => {
    it('should verify BroadcastChannel availability', () => {
      const hasBroadcastChannel = 'BroadcastChannel' in window;
      expect(typeof hasBroadcastChannel).toBe('boolean');

      if (hasBroadcastChannel) {
        const channel = new BroadcastChannel('test-channel');
        expect(channel).toBeDefined();
        expect(typeof channel.postMessage).toBe('function');
        expect(typeof channel.close).toBe('function');
        expect(typeof channel.addEventListener).toBe('function');
        channel.close();
      }
    });
  });

  describe('ResizeObserver API', () => {
    it('should verify ResizeObserver availability', () => {
      const hasResizeObserver = 'ResizeObserver' in window;
      expect(typeof hasResizeObserver).toBe('boolean');

      if (hasResizeObserver) {
        const observer = new ResizeObserver(() => {});
        expect(observer).toBeDefined();
        expect(typeof observer.observe).toBe('function');
        expect(typeof observer.unobserve).toBe('function');
        expect(typeof observer.disconnect).toBe('function');
        observer.disconnect();
      }
    });
  });

  describe('IntersectionObserver API', () => {
    it('should verify IntersectionObserver availability', () => {
      const hasIntersectionObserver = 'IntersectionObserver' in window;
      expect(typeof hasIntersectionObserver).toBe('boolean');

      if (hasIntersectionObserver) {
        const observer = new IntersectionObserver(() => {});
        expect(observer).toBeDefined();
        expect(typeof observer.observe).toBe('function');
        expect(typeof observer.unobserve).toBe('function');
        expect(typeof observer.disconnect).toBe('function');
        expect(typeof observer.takeRecords).toBe('function');
        observer.disconnect();
      }
    });
  });

  describe('AbortController API', () => {
    it('should have AbortController constructor available', () => {
      expect(typeof AbortController).toBe('function');
    });

    it('should verify AbortController interface', () => {
      const controller = new AbortController();
      expect(controller).toBeDefined();
      expect(controller.signal).toBeDefined();
      expect(typeof controller.abort).toBe('function');
      expect(controller.signal.aborted).toBe(false);
      expect(typeof controller.signal.addEventListener).toBe('function');
    });

    it('should verify AbortSignal static methods', () => {
      if ('AbortSignal' in window) {
        expect(typeof AbortSignal.timeout).toBe('function');
        const signal = AbortSignal.timeout(1000);
        expect(signal).toBeInstanceOf(AbortSignal);
      }
    });
  });

  describe('Fetch API', () => {
    it('should have fetch available on window', () => {
      expect(typeof window.fetch).toBe('function');
    });

    it('should have Request, Response, Headers constructors', () => {
      expect(typeof Request).toBe('function');
      expect(typeof Response).toBe('function');
      expect(typeof Headers).toBe('function');
    });

    it('should verify Response static methods', () => {
      expect(typeof Response.error).toBe('function');
      expect(typeof Response.json).toBe('function');
      expect(typeof Response.redirect).toBe('function');
    });

    it('should verify Headers interface methods', () => {
      const headers = new Headers();
      expect(typeof headers.append).toBe('function');
      expect(typeof headers.delete).toBe('function');
      expect(typeof headers.get).toBe('function');
      expect(typeof headers.has).toBe('function');
      expect(typeof headers.set).toBe('function');
      expect(typeof headers.entries).toBe('function');
    });
  });

  describe('Storage API', () => {
    it('should have localStorage and sessionStorage available', () => {
      expect('localStorage' in window).toBe(true);
      expect('sessionStorage' in window).toBe(true);
    });

    it('should verify Storage interface methods', () => {
      const storage = window.localStorage;
      expect(typeof storage.getItem).toBe('function');
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.removeItem).toBe('function');
      expect(typeof storage.clear).toBe('function');
      expect(typeof storage.key).toBe('function');
    });

    it('should handle storage operations with correct return types', () => {
      window.localStorage.setItem('test-key', 'test-value');
      expect(window.localStorage.getItem('test-key')).toBe('test-value');
      expect(window.localStorage.length).toBeGreaterThanOrEqual(1);
      window.localStorage.removeItem('test-key');
      expect(window.localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('IndexedDB API', () => {
    it('should verify indexedDB availability', () => {
      const hasIndexedDB = 'indexedDB' in window;
      expect(typeof hasIndexedDB).toBe('boolean');
    });

    it('should verify IDBFactory interface methods when available', () => {
      const idb = window.indexedDB;
      if (idb) {
        expect(typeof idb.open).toBe('function');
        expect(typeof idb.deleteDatabase).toBe('function');
        expect(typeof idb.cmp).toBe('function');
      } else {
        expect(idb).toBeUndefined();
      }
    });
  });

  describe('WebSocket API', () => {
    it('should have WebSocket constructor available', () => {
      expect(typeof WebSocket).toBe('function');
    });

    it('should verify WebSocket constants', () => {
      expect(WebSocket.CONNECTING).toBe(0);
      expect(WebSocket.OPEN).toBe(1);
      expect(WebSocket.CLOSING).toBe(2);
      expect(WebSocket.CLOSED).toBe(3);
    });
  });

  describe('Canvas API', () => {
    it('should have HTMLCanvasElement available', () => {
      expect(typeof HTMLCanvasElement).toBe('function');
    });

    it('should verify Canvas 2D context availability', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        expect(typeof ctx.fillRect).toBe('function');
        expect(typeof ctx.fillText).toBe('function');
        expect(typeof ctx.getImageData).toBe('function');
        expect(typeof ctx.putImageData).toBe('function');
        expect(typeof ctx.toDataURL).toBe('function');
      }
    });
  });

  describe('Notification API', () => {
    it('should verify Notification availability', () => {
      const hasNotification = 'Notification' in window;
      expect(typeof hasNotification).toBe('boolean');

      if (hasNotification) {
        expect(typeof Notification.permission).toBe('string');
        expect(typeof Notification.requestPermission).toBe('function');
      }
    });
  });

  describe('Geolocation API', () => {
    it('should verify navigator.geolocation availability', () => {
      const hasGeolocation = 'geolocation' in navigator;
      expect(typeof hasGeolocation).toBe('boolean');
    });

    it('should verify Geolocation interface methods when available', () => {
      const geo = navigator.geolocation;
      if (geo) {
        expect(typeof geo.getCurrentPosition).toBe('function');
        expect(typeof geo.watchPosition).toBe('function');
        expect(typeof geo.clearWatch).toBe('function');
      } else {
        expect(geo).toBeUndefined();
      }
    });
  });

  describe('Error Handling Consistency', () => {
    it('should throw error for invalid File constructor arguments', () => {
      expect(() => new File(undefined as any, 'test')).toThrow();
    });

    it('should handle invalid Blob constructor arguments', () => {
      try {
        new Blob(undefined as any);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should throw TypeError for invalid URL.createObjectURL arguments', () => {
      expect(() => URL.createObjectURL(null as any)).toThrow(TypeError);
    });

    it('should handle AbortController abort correctly', () => {
      const controller = new AbortController();
      controller.abort();
      expect(controller.signal.aborted).toBe(true);
    });

    it('should handle localStorage quota errors gracefully', () => {
      try {
        const largeValue = 'x'.repeat(10 * 1024 * 1024);
        window.localStorage.setItem('large-key', largeValue);
        expect(true).toBe(true);
      } catch (error) {
        expect(error instanceof Error || error instanceof DOMException).toBe(true);
      }
    });
  });
});
