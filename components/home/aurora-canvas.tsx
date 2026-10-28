'use client';

import { useEffect, useRef } from 'react';
import { AURORA_FRAGMENT, AURORA_VERTEX, auroraFlow, readAuroraColours } from '@/lib/aurora-shader';

/**
 * The field is soft, so it renders at half resolution: device pixel ratio capped at 1.5, then halved,
 * so never more than 0.75 canvas pixels per CSS pixel.
 */
const SCALE = 0.5;
/** Seconds into the flow for the first frame: a pleasing moment (and the only one under reduced motion). */
const START_TIME = 12;

const dev = process.env.NODE_ENV !== 'production';

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  if (dev) console.warn('Aurora shader failed to compile:', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

/** The linked program, or null. The shader objects are deleted either way: the program keeps what it needs. */
function link(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, AURORA_VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, AURORA_FRAGMENT);
  const program = vs && fs ? gl.createProgram() : null;
  if (program && vs && fs) {
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
  }
  const linked = !!program && gl.getProgramParameter(program, gl.LINK_STATUS);
  if (program && !linked && dev) console.warn('Aurora program failed to link:', gl.getProgramInfoLog(program));
  if (program && vs) gl.detachShader(program, vs);
  if (program && fs) gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (linked) return program;
  gl.deleteProgram(program);
  return null;
}

type Props = {
  playing: boolean;
  /** No WebGL, or the shader would not build: show the still fallback. */
  onUnsupported: () => void;
  /** The context was lost (iOS does this to background tabs): the parent may remount on a new canvas. */
  onLost: () => void;
};

/**
 * Draws the hero aurora. Runs only while `playing`, on screen and in a visible tab; otherwise it
 * keeps its last frame. Follows the pointer gently, re-reads the colours when the theme changes,
 * and writes a frame count to `data-frame` about twice a second (the end-to-end tests read it).
 */
export default function AuroraCanvas({ playing, onUnsupported, onLost }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // The GL effect runs once per canvas; the callbacks are read through a ref so a new identity
  // from the parent never rebuilds the context.
  const callbacks = useRef({ onUnsupported, onLost });
  useEffect(() => { callbacks.current = { onUnsupported, onLost }; });
  const playingRef = useRef(playing);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    playingRef.current = playing;
    wakeRef.current();
  }, [playing]);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    const program = gl && link(gl);
    if (!canvas || !gl || !program) { callbacks.current.onUnsupported(); return; }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u('uRes'); const uFlow = u('uFlow'); const uPointer = u('uPointer');

    const setColours = () => {
      const { bg, stops, alpha } = readAuroraColours();
      gl.uniform3fv(u('uBg'), bg);
      gl.uniform3fv(u('uC1'), stops[0]);
      gl.uniform3fv(u('uC2'), stops[1]);
      gl.uniform3fv(u('uC3'), stops[2]);
      gl.uniform1f(u('uAlpha'), alpha);
    };
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const k = Math.min(window.devicePixelRatio || 1, 1.5) * SCALE;
      canvas.width = Math.max(1, Math.round(width * k));
      canvas.height = Math.max(1, Math.round(height * k));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let raf = 0;
    let last = 0;
    let time = START_TIME;
    let frames = 0;
    let inView = true;
    let visible = !document.hidden;
    const pointer = { x: 0.75, y: 0.5 };
    const target = { x: 0.75, y: 0.5 };

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uFlow, auroraFlow(time));
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const running = () => playingRef.current && inView && visible;
    const tick = (t: number) => {
      raf = 0;
      time += last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;
      draw();
      frames += 1;
      if (frames % 30 === 0) canvas.dataset.frame = String(frames);
      if (running()) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const wake = () => { if (!raf && running()) raf = requestAnimationFrame(tick); };
    wakeRef.current = wake;

    setColours();
    resize();
    draw();
    canvas.dataset.frame = '0';
    canvas.style.opacity = '1';
    wake();

    const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; wake(); });
    io.observe(canvas);
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);
    const theme = new MutationObserver(() => { setColours(); draw(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const onVisibility = () => { visible = !document.hidden; wake(); };
    document.addEventListener('visibilitychange', onVisibility);
    // Only while it plays: a paused, hidden or off-screen field needs no layout read per move.
    const onPointer = (e: PointerEvent) => {
      if (!running()) return;
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    // No restore handling: the parent remounts on a fresh canvas, which gets a fresh context.
    const onLost = () => { cancelAnimationFrame(raf); raf = 0; wakeRef.current = () => {}; callbacks.current.onLost(); };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      io.disconnect();
      ro.disconnect();
      theme.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // A real unmount detaches the canvas first, so release the GPU context now rather than at
      // garbage collection. Strict Mode's simulated unmount keeps it attached and runs the effect
      // again on the same canvas, where a lost context would come back from getContext() unusable.
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="block size-full opacity-0 transition-opacity duration-700 ease-out" />;
}
