import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveRequestPath } from '@/scripts/serve-out.mjs';

const root = path.resolve('/srv/out');
const at = (rel: string) => path.join(root, rel);

describe('resolveRequestPath', () => {
  it('strips the base path and maps directories to index.html', () => {
    expect(resolveRequestPath('/grant-assesser/', root)).toBe(at('index.html'));
    expect(resolveRequestPath('/grant-assesser/plan/?tab=goals', root)).toBe(at('plan/index.html'));
    expect(resolveRequestPath('/grant-assesser/_next/static/app.js', root)).toBe(at('_next/static/app.js'));
  });
  it('decodes percent-encoded paths', () => {
    expect(resolveRequestPath('/grant-assesser/a%20b.txt', root)).toBe(at('a b.txt'));
  });
  it('ignores paths outside the base path', () => {
    expect(resolveRequestPath('/', root)).toBeNull();
    expect(resolveRequestPath('/grant-assesserx/', root)).toBeNull();
    expect(resolveRequestPath('/other/index.html', root)).toBeNull();
  });
  it('rejects path traversal, plain and encoded', () => {
    expect(resolveRequestPath('/grant-assesser/../package.json', root)).toBeNull();
    expect(resolveRequestPath('/grant-assesser/%2e%2e/package.json', root)).toBeNull();
    expect(resolveRequestPath('/grant-assesser/a/%2e%2e%2f%2e%2e/package.json', root)).toBeNull();
    expect(resolveRequestPath('/grant-assesser/..%5c..%5cpackage.json', root)).toBeNull();
    expect(resolveRequestPath('/grant-assesser/a%00.html', root)).toBeNull();
  });
  it('rejects malformed encodings', () => {
    expect(resolveRequestPath('/grant-assesser/%E0%A4%A', root)).toBeNull();
  });
});
