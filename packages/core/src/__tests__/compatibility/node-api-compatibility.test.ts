import { describe, it, expect, vi } from 'vitest';

/**
 * Node.js API 兼容性测试套件
 * 覆盖 Buffer、Stream、Crypto 等核心 API
 */
describe('Node.js API Compatibility', () => {
  describe('Buffer API', () => {
    it('should have Buffer constructor available', () => {
      expect(typeof Buffer).toBe('function');
    });

    it('should verify Buffer static methods exist', () => {
      expect(typeof Buffer.alloc).toBe('function');
      expect(typeof Buffer.allocUnsafe).toBe('function');
      expect(typeof Buffer.from).toBe('function');
      expect(typeof Buffer.isBuffer).toBe('function');
      expect(typeof Buffer.isEncoding).toBe('function');
      expect(typeof Buffer.concat).toBe('function');
      expect(typeof Buffer.compare).toBe('function');
    });

    it('should create Buffer from string correctly', () => {
      const buf = Buffer.from('hello world', 'utf8');
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(11);
      expect(buf.toString()).toBe('hello world');
    });

    it('should create Buffer from array correctly', () => {
      const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(5);
      expect(buf.toString()).toBe('Hello');
    });

    it('should create Buffer with alloc correctly', () => {
      const buf = Buffer.alloc(10);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(10);
      expect(buf.every(b => b === 0)).toBe(true);
    });

    it('should verify Buffer instance methods', () => {
      const buf = Buffer.from('test');
      expect(typeof buf.toString).toBe('function');
      expect(typeof buf.toJSON).toBe('function');
      expect(typeof buf.slice).toBe('function');
      expect(typeof buf.write).toBe('function');
      expect(typeof buf.equals).toBe('function');
      expect(typeof buf.compare).toBe('function');
      expect(typeof buf.copy).toBe('function');
      expect(typeof buf.fill).toBe('function');
    });

    it('should handle Buffer encoding correctly', () => {
      const buf = Buffer.from('hello');
      expect(buf.toString('hex')).toBe('68656c6c6f');
      expect(buf.toString('base64')).toBe('aGVsbG8=');
      expect(buf.toString('utf8')).toBe('hello');
    });

    it('should verify Buffer.isBuffer works correctly', () => {
      expect(Buffer.isBuffer(Buffer.from('test'))).toBe(true);
      expect(Buffer.isBuffer('not a buffer')).toBe(false);
      expect(Buffer.isBuffer(new Uint8Array(4))).toBe(false);
    });

    it('should handle Buffer.concat correctly', () => {
      const buf1 = Buffer.from('hello');
      const buf2 = Buffer.from(' ');
      const buf3 = Buffer.from('world');
      const combined = Buffer.concat([buf1, buf2, buf3]);
      expect(combined.toString()).toBe('hello world');
    });

    it('should handle Buffer encoding errors', () => {
      expect(() => Buffer.from('test', 'invalid-encoding' as any)).toThrow();
    });

    it('should handle Buffer overflow errors', () => {
      const buf = Buffer.alloc(4);
      expect(() => buf.write('hello world', 0, 4, 'utf8')).not.toThrow();
      expect(() => buf.write('hello world', 10, 'utf8')).toThrow();
    });

    it('should verify Buffer.byteLength', () => {
      expect(Buffer.byteLength('hello', 'utf8')).toBe(5);
      expect(Buffer.byteLength('你好', 'utf8')).toBe(6);
    });
  });

  describe('Stream API', () => {
    it('should have stream module constructors available', async () => {
      const stream = await import('stream');
      expect(typeof stream.Readable).toBe('function');
      expect(typeof stream.Writable).toBe('function');
      expect(typeof stream.Duplex).toBe('function');
      expect(typeof stream.Transform).toBe('function');
      expect(typeof stream.PassThrough).toBe('function');
    });

    it('should verify Readable stream interface', async () => {
      const { Readable } = await import('stream');
      const readable = new Readable({
        read() {}
      });
      expect(readable).toBeDefined();
      expect(typeof readable.read).toBe('function');
      expect(typeof readable.pipe).toBe('function');
      expect(typeof readable.on).toBe('function');
      expect(typeof readable.pause).toBe('function');
      expect(typeof readable.resume).toBe('function');
      expect(typeof readable.destroy).toBe('function');
    });

    it('should verify Writable stream interface', async () => {
      const { Writable } = await import('stream');
      const writable = new Writable({
        write() {}
      });
      expect(writable).toBeDefined();
      expect(typeof writable.write).toBe('function');
      expect(typeof writable.end).toBe('function');
      expect(typeof writable.destroy).toBe('function');
      expect(typeof writable.on).toBe('function');
    });

    it('should verify Transform stream interface', async () => {
      const { Transform } = await import('stream');
      const transform = new Transform({
        transform() {}
      });
      expect(transform).toBeDefined();
      expect(typeof transform.write).toBe('function');
      expect(typeof transform.read).toBe('function');
      expect(typeof transform.pipe).toBe('function');
    });

    it('should verify PassThrough stream', async () => {
      const { PassThrough } = await import('stream');
      const pass = new PassThrough();
      expect(pass).toBeDefined();
      expect(typeof pass.write).toBe('function');
      expect(typeof pass.read).toBe('function');
    });

    it('should handle stream piping correctly', async () => {
      const { Readable, Writable } = await import('stream');
      const chunks: Buffer[] = [];

      const readable = new Readable({
        read() {
          this.push(Buffer.from('hello'));
          this.push(null);
        }
      });

      const writable = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      readable.pipe(writable);

      await new Promise<void>((resolve) => {
        writable.on('finish', () => {
          expect(Buffer.concat(chunks).toString()).toBe('hello');
          resolve();
        });
      });
    });

    it('should verify Readable.from static method', async () => {
      const { Readable } = await import('stream');
      if (typeof Readable.from === 'function') {
        const stream = Readable.from(['a', 'b', 'c']);
        expect(stream).toBeDefined();
      }
    });

    it('should handle stream errors correctly', async () => {
      const { Readable } = await import('stream');
      const readable = new Readable({
        read() {
          this.destroy(new Error('Stream error'));
        }
      });

      const err = await new Promise<Error>((resolve) => {
        readable.on('error', (err) => resolve(err));
        readable.read();
      });
      expect(err.message).toBe('Stream error');
    }, 10000);

    it('should verify stream.finished utility', async () => {
      const streamModule = await import('stream');
      expect(typeof streamModule.finished).toBe('function');
    });

    it('should verify stream.pipeline utility', async () => {
      const streamModule = await import('stream');
      expect(typeof streamModule.pipeline).toBe('function');
    });
  });

  describe('Crypto API', () => {
    it('should have crypto module available', async () => {
      const crypto = await import('crypto');
      expect(crypto).toBeDefined();
      expect(typeof crypto.randomBytes).toBe('function');
      expect(typeof crypto.createHash).toBe('function');
      expect(typeof crypto.createHmac).toBe('function');
    });

    it('should verify crypto.createHash interface', async () => {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256');
      expect(hash).toBeDefined();
      expect(typeof hash.update).toBe('function');
      expect(typeof hash.digest).toBe('function');
      expect(typeof hash.copy).toBe('function');
    });

    it('should generate correct SHA-256 hash', async () => {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update('hello').digest('hex');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should generate correct MD5 hash', async () => {
      const { createHash } = await import('crypto');
      const hash = createHash('md5').update('hello').digest('hex');
      expect(hash).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    it('should verify crypto.createHmac interface', async () => {
      const { createHmac } = await import('crypto');
      const hmac = createHmac('sha256', 'secret');
      expect(hmac).toBeDefined();
      expect(typeof hmac.update).toBe('function');
      expect(typeof hmac.digest).toBe('function');
    });

    it('should generate correct HMAC', async () => {
      const { createHmac } = await import('crypto');
      const hmac = createHmac('sha256', 'secret').update('hello').digest('hex');
      expect(typeof hmac).toBe('string');
      expect(hmac.length).toBe(64);
    });

    it('should verify randomBytes returns Buffer', async () => {
      const { randomBytes } = await import('crypto');
      const buf = randomBytes(16);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(16);
    });

    it('should verify randomBytes with callback', async () => {
      const { randomBytes } = await import('crypto');
      const buf = await new Promise<Buffer>((resolve, reject) => {
        randomBytes(16, (err, buffer) => {
          if (err) reject(err);
          else resolve(buffer);
        });
      });
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(16);
    });

    it('should handle crypto.createHash with unsupported algorithm', async () => {
      const { createHash } = await import('crypto');
      expect(() => createHash('unsupported-algorithm')).toThrow();
    });

    it('should verify crypto.createCipheriv/createDecipheriv', async () => {
      const crypto = await import('crypto');
      expect(typeof crypto.createCipheriv).toBe('function');
      expect(typeof crypto.createDecipheriv).toBe('function');
    });

    it('should verify cipher encryption and decryption', async () => {
      const { createCipheriv, createDecipheriv, randomBytes } = await import('crypto');
      const key = randomBytes(32);
      const iv = randomBytes(16);
      const algorithm = 'aes-256-cbc';

      const cipher = createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update('hello world', 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const decipher = createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      expect(decrypted).toBe('hello world');
    });

    it('should verify crypto.scrypt availability', async () => {
      const crypto = await import('crypto');
      expect(typeof crypto.scrypt).toBe('function');
      expect(typeof crypto.scryptSync).toBe('function');
    });

    it('should verify crypto.pbkdf2 availability', async () => {
      const crypto = await import('crypto');
      expect(typeof crypto.pbkdf2).toBe('function');
      expect(typeof crypto.pbkdf2Sync).toBe('function');
    });
  });

  describe('Process API', () => {
    it('should have process object available', () => {
      expect(typeof process).toBe('object');
    });

    it('should verify process properties', () => {
      expect(typeof process.version).toBe('string');
      expect(typeof process.platform).toBe('string');
      expect(typeof process.arch).toBe('string');
      expect(typeof process.pid).toBe('number');
      expect(typeof process.cwd).toBe('function');
      expect(typeof process.env).toBe('object');
    });

    it('should verify process.nextTick', () => {
      expect(typeof process.nextTick).toBe('function');
    });

    it('should verify process.hrtime or process.hrtime.bigint', () => {
      expect(typeof process.hrtime).toBe('function');
      if (process.hrtime.bigint) {
        expect(typeof process.hrtime.bigint).toBe('function');
      }
    });
  });

  describe('Path API', () => {
    it('should have path module available', async () => {
      const path = await import('path');
      expect(path).toBeDefined();
      expect(typeof path.join).toBe('function');
      expect(typeof path.resolve).toBe('function');
      expect(typeof path.basename).toBe('function');
      expect(typeof path.dirname).toBe('function');
      expect(typeof path.extname).toBe('function');
      expect(typeof path.parse).toBe('function');
      expect(typeof path.format).toBe('function');
      expect(typeof path.normalize).toBe('function');
      expect(typeof path.relative).toBe('function');
    });

    it('should verify path.join returns correct type', async () => {
      const { join } = await import('path');
      const result = join('foo', 'bar', 'baz');
      expect(typeof result).toBe('string');
    });

    it('should verify path.extname returns correct extension', async () => {
      const { extname } = await import('path');
      expect(extname('file.txt')).toBe('.txt');
      expect(extname('file')).toBe('');
      expect(extname('archive.tar.gz')).toBe('.gz');
    });
  });

  describe('URL API', () => {
    it('should have URL constructor available', () => {
      expect(typeof URL).toBe('function');
    });

    it('should verify URL interface properties', () => {
      const url = new URL('https://example.com:8080/path?query=1#hash');
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('example.com');
      expect(url.port).toBe('8080');
      expect(url.pathname).toBe('/path');
      expect(url.search).toBe('?query=1');
      expect(url.hash).toBe('#hash');
      expect(typeof url.toString).toBe('function');
      expect(typeof url.toJSON).toBe('function');
    });

    it('should verify URLSearchParams interface', () => {
      const params = new URLSearchParams('a=1&b=2');
      expect(params.get('a')).toBe('1');
      expect(params.get('b')).toBe('2');
      expect(typeof params.append).toBe('function');
      expect(typeof params.delete).toBe('function');
      expect(typeof params.getAll).toBe('function');
      expect(typeof params.has).toBe('function');
      expect(typeof params.set).toBe('function');
      expect(typeof params.sort).toBe('function');
      expect(typeof params.entries).toBe('function');
    });
  });

  describe('Timer API', () => {
    it('should have setTimeout and setInterval available', () => {
      expect(typeof setTimeout).toBe('function');
      expect(typeof setInterval).toBe('function');
      expect(typeof clearTimeout).toBe('function');
      expect(typeof clearInterval).toBe('function');
    });

    it('should verify setImmediate/clearImmediate if available', () => {
      if (typeof setImmediate !== 'undefined') {
        expect(typeof setImmediate).toBe('function');
        expect(typeof clearImmediate).toBe('function');
      }
    });

    it('should return timer id from setTimeout', () => {
      const id = setTimeout(() => {}, 1000);
      expect(id).toBeDefined();
      clearTimeout(id);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should throw TypeError for invalid Buffer.alloc arguments', () => {
      expect(() => Buffer.alloc(-1)).toThrow(RangeError);
      expect(() => Buffer.alloc('invalid' as any)).toThrow(TypeError);
    });

    it('should throw TypeError for invalid Buffer.from arguments', () => {
      expect(() => Buffer.from({} as any)).toThrow(TypeError);
    });

    it('should handle stream write after end error', async () => {
      const { Writable } = await import('stream');
      const writable = new Writable({ write() {} });
      writable.end();
      writable.on('error', () => {});
      writable.write('data');
      expect(writable.writableEnded).toBe(true);
    });

    it('should handle crypto errors for invalid key lengths', async () => {
      const { createCipheriv, randomBytes } = await import('crypto');
      const key = randomBytes(16);
      const iv = randomBytes(16);
      expect(() => createCipheriv('aes-256-cbc', key, iv)).toThrow(RangeError);
    });

    it('should handle URL constructor errors', () => {
      expect(() => new URL('not-a-valid-url')).toThrow(TypeError);
      expect(() => new URL('')).toThrow(TypeError);
    });

    it('should handle path parsing errors gracefully', async () => {
      const { parse } = await import('path');
      expect(() => parse('')).not.toThrow();
      const result = parse('');
      expect(result).toHaveProperty('root');
      expect(result).toHaveProperty('dir');
      expect(result).toHaveProperty('base');
      expect(result).toHaveProperty('ext');
      expect(result).toHaveProperty('name');
    });
  });
});
