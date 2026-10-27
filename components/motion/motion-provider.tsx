'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { LazyMotion, MotionConfig, useReducedMotion, type FeatureBundle } from 'motion/react';

let loaded = false;
const listeners = new Set<() => void>();

const loadFeatures = () =>
  import('./features').then(
    (mod) => {
      // Tell components after LazyMotion has stored the renderer (its own .then runs first), so an
      // element that starts hidden because of this always has the means to animate in.
      setTimeout(() => {
        loaded = true;
        listeners.forEach((l) => l());
      }, 0);
      return mod.default;
    },
    // The chunk failed to load. Never settle: LazyMotion waits quietly (no unhandled rejection),
    // `loaded` stays false, and m.* elements stay plain, visible elements.
    () => new Promise<FeatureBundle>(() => {}),
  );

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

/** True once motion's features have loaded. False on the server and while hydrating. */
export const useMotionFeaturesLoaded = () => useSyncExternalStore(subscribe, () => loaded, () => false);

/**
 * True when an m.* element may start hidden and animate in: the features have loaded and the device
 * does not ask for reduced motion. Until then use `initial={false}`, or the element would stay
 * hidden (an m.* element cannot animate without the features), or flash for a frame.
 */
export function useMotionReady(): boolean {
  const ready = useMotionFeaturesLoaded();
  const reduce = useReducedMotion() ?? false;
  return ready && !reduce;
}

/**
 * Lets `m.*` components animate (features load after first paint). With reduced motion every
 * animation is skipped, opacity included: values jump to their targets. `strict` forbids the
 * heavier `motion.*`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" skipAnimations={reduce}>{children}</MotionConfig>
    </LazyMotion>
  );
}
