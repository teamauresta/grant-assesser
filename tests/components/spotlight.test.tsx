// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSpotlight } from '@/components/ui/spotlight';

// jsdom has no PointerEvent, and fireEvent.pointerMove drops pointerType without one.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      readonly pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerType = init.pointerType ?? '';
      }
    }
    window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
  }
});

function List() {
  const ref = useSpotlight<HTMLUListElement>();
  return (
    <ul ref={ref}>
      <li data-spotlight="">first</li>
      <li data-spotlight="">
        <span>second</span>
      </li>
    </ul>
  );
}

function setup() {
  render(<List />);
  const first = screen.getByText('first');
  const second = screen.getByText('second').parentElement!;
  second.getBoundingClientRect = () => ({ left: 10, top: 5, right: 110, bottom: 55, width: 100, height: 50, x: 10, y: 5, toJSON: () => ({}) });
  return { first, second, inner: screen.getByText('second') };
}

describe('useSpotlight', () => {
  it('writes the mouse position on the hovered card, relative to the card, and nothing on the others', () => {
    const { first, second, inner } = setup();
    fireEvent.pointerMove(inner, { pointerType: 'mouse', clientX: 30, clientY: 20 });
    expect(second.style.getPropertyValue('--spot-x')).toBe('20px');
    expect(second.style.getPropertyValue('--spot-y')).toBe('15px');
    expect(first.style.getPropertyValue('--spot-x')).toBe('');
    expect(first.style.getPropertyValue('--spot-y')).toBe('');
  });

  it('follows a pen too', () => {
    const { second } = setup();
    fireEvent.pointerMove(second, { pointerType: 'pen', clientX: 60, clientY: 45 });
    expect(second.style.getPropertyValue('--spot-x')).toBe('50px');
    expect(second.style.getPropertyValue('--spot-y')).toBe('40px');
  });

  it('stops listening when the list unmounts', () => {
    const { unmount } = render(<List />);
    const card = screen.getByText('first');
    unmount();
    // A detached tree still bubbles events, so a leftover listener would still write the position.
    fireEvent.pointerMove(card, { pointerType: 'mouse', clientX: 30, clientY: 20 });
    expect(card.style.getPropertyValue('--spot-x')).toBe('');
  });

  it('ignores touch', () => {
    const { second } = setup();
    fireEvent.pointerMove(second, { pointerType: 'touch', clientX: 30, clientY: 20 });
    expect(second.style.getPropertyValue('--spot-x')).toBe('');
    expect(second.style.getPropertyValue('--spot-y')).toBe('');
  });
});
