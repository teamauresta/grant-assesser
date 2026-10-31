// @vitest-environment jsdom
import { useRef } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useHeightVar } from '@/lib/use-height-var';

/** A ResizeObserver that reports when the test says so. */
class FakeObserver {
  static last: FakeObserver | undefined;
  observed: Element[] = [];
  disconnected = false;
  constructor(readonly callback: ResizeObserverCallback) { FakeObserver.last = this; }
  observe(el: Element) { this.observed.push(el); }
  unobserve() {}
  disconnect() { this.disconnected = true; }
  /** Reports a new border-box height for the observed element. */
  resize(height: number) {
    const target = this.observed[0];
    target.getBoundingClientRect = () => ({ height } as DOMRect);
    this.callback([{ target } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  useHeightVar(ref, '--test-footer-h');
  return <div ref={ref}>footer</div>;
}

const value = () => document.documentElement.style.getPropertyValue('--test-footer-h');

describe('useHeightVar', () => {
  afterEach(() => { vi.unstubAllGlobals(); FakeObserver.last = undefined; });

  it('sets the element\'s height on <html> as it changes, and removes it on unmount', () => {
    vi.stubGlobal('ResizeObserver', FakeObserver);
    const { unmount, getByText } = render(<Footer />);
    const observer = FakeObserver.last!;
    expect(observer.observed).toEqual([getByText('footer')]);

    act(() => observer.resize(69));
    expect(value()).toBe('69px');
    act(() => observer.resize(138.5));
    expect(value()).toBe('138.5px');

    unmount();
    expect(observer.disconnected).toBe(true);
    expect(value()).toBe('');
  });

  it('leaves the CSS default alone without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { unmount } = render(<Footer />);
    expect(value()).toBe('');
    unmount();
  });
});
