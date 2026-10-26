// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile } from '@/lib/download';

describe('downloadFile', () => {
  let created: Blob[];
  let revoked: string[];
  let clicked: HTMLAnchorElement[];

  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    revoked = [];
    clicked = [];
    URL.createObjectURL = vi.fn((b: Blob) => { created.push(b); return `blob:test/${created.length}`; });
    URL.revokeObjectURL = vi.fn((u: string) => { revoked.push(u); });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      // The anchor must be in the document when clicked (Firefox ignores detached anchors).
      expect(this.isConnected).toBe(true);
      clicked.push(this);
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('saves a string with the given name and type, then removes the anchor', async () => {
    downloadFile('a.json', '{"x":1}', 'application/json');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('a.json');
    expect(clicked[0].href).toBe('blob:test/1');
    expect(clicked[0].isConnected).toBe(false);
    expect(created[0].type).toBe('application/json');
    expect(await created[0].text()).toBe('{"x":1}');
  });

  it('passes a Blob through unchanged', () => {
    const blob = new Blob(['hi'], { type: 'text/plain' });
    downloadFile('a.txt', blob);
    expect(created[0]).toBe(blob);
  });

  it('revokes the object URL later, not synchronously', () => {
    downloadFile('a.json', '{}', 'application/json');
    expect(revoked).toEqual([]);
    vi.runAllTimers();
    expect(revoked).toEqual(['blob:test/1']);
  });
});
