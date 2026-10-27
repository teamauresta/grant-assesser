import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDLE_MS, SETTLE_MS, particleIdle } from '@/lib/particle-idle';

const container = () => ({ play: vi.fn(), pause: vi.fn() });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('particleIdle (WCAG 2.2.2: automatic motion stops within 5 seconds)', () => {
  it('lets a new container run, then pauses it 5 seconds after load', () => {
    expect(SETTLE_MS).toBeLessThanOrEqual(5_000);
    const idle = particleIdle();
    const c = container();
    idle.attach(c);
    expect(c.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(c.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(c.pause).toHaveBeenCalledTimes(1);
    expect(c.play).not.toHaveBeenCalled();
  });

  it('plays again on pointer movement and pauses once the pointer has been still for IDLE_MS', () => {
    const idle = particleIdle();
    const c = container();
    idle.attach(c);
    vi.advanceTimersByTime(SETTLE_MS);
    idle.pointer();
    expect(c.play).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(IDLE_MS - 100);
    // Further moves keep it running without calling play() again (play() redraws each time).
    idle.pointer();
    expect(c.play).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(c.pause).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(c.pause).toHaveBeenCalledTimes(2);
  });

  it('never cuts the first 5 seconds short because of a pointer move', () => {
    const idle = particleIdle();
    const c = container();
    idle.attach(c);
    vi.advanceTimersByTime(1_000);
    idle.pointer();
    vi.advanceTimersByTime(IDLE_MS);
    expect(c.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SETTLE_MS - 1_000 - IDLE_MS);
    expect(c.pause).toHaveBeenCalledTimes(1);
  });

  it('pauses while out of view, and on return resumes only if the pointer rule allows it', () => {
    const idle = particleIdle();
    const c = container();
    idle.attach(c);
    idle.setInView(false);
    expect(c.pause).toHaveBeenCalledTimes(1);
    // Moving the pointer elsewhere on the page does not wake a hero that is out of view.
    idle.pointer();
    expect(c.play).not.toHaveBeenCalled();
    idle.setInView(true);
    expect(c.play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(SETTLE_MS);
    expect(c.pause).toHaveBeenCalledTimes(2);
    idle.setInView(false);
    idle.setInView(true);
    // Back in view after it settled: still paused, nothing called.
    expect(c.play).toHaveBeenCalledTimes(1);
    expect(c.pause).toHaveBeenCalledTimes(2);
  });

  it('starts a new 5-second window for a reloaded container (a theme change)', () => {
    const idle = particleIdle();
    const first = container();
    idle.attach(first);
    vi.advanceTimersByTime(SETTLE_MS);
    const second = container();
    idle.attach(second);
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(second.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(second.pause).toHaveBeenCalledTimes(1);
  });

  it('pauses a container that loads while the hero is out of view', () => {
    const idle = particleIdle();
    idle.setInView(false);
    const c = container();
    idle.attach(c);
    expect(c.pause).toHaveBeenCalledTimes(1);
  });

  it('does nothing after dispose', () => {
    const idle = particleIdle();
    const c = container();
    idle.attach(c);
    idle.dispose();
    vi.advanceTimersByTime(SETTLE_MS * 2);
    idle.pointer();
    expect(c.pause).not.toHaveBeenCalled();
    expect(c.play).not.toHaveBeenCalled();
  });

  it('works again after dispose when a container attaches (React runs effects twice in development)', () => {
    const idle = particleIdle();
    idle.dispose();
    const c = container();
    idle.attach(c);
    vi.advanceTimersByTime(SETTLE_MS);
    expect(c.pause).toHaveBeenCalledTimes(1);
  });
});
