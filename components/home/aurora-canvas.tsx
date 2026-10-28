'use client';

import { useEffect, useRef } from 'react';
import { AURORA_FRAGMENT, AURORA_VERTEX, readAuroraColours } from '@/lib/aurora';

/** The field is soft, so it renders at half resolution, and never above 1.5 device pixels per CSS pixel. */
const SCALE = 0.5;
/** A pleasing moment of the flow for the first frame (and the only one under reduced motion). */
const START_TIME = 12;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function link(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, AURORA_VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, AURORA_FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/**
 * Draws the hero aurora. Runs only while `playing`, on screen and in a visible tab; otherwise it
 * keeps its last frame. Follows the pointer gently, re-reads the colours when the theme changes,
 * and writes a frame count to `data-frame` about twice a second (the end-to-end tests read it).
 */
export default function AuroraCanvas({ playing, onUnsupported }: { playing: boolean; onUnsupported: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
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
    if (!canvas || !gl || !program) { onUnsupported(); return; }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u('uRes'); const uTime = u('uTime'); const uPointer = u('uPointer');

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
      gl.uniform1f(uTime, time);
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
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    const onLost = (e: Event) => { e.preventDefault(); onUnsupported(); };
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
      // Free what this effect made but keep the context: Strict Mode runs the effect again on the
      // same canvas, and a lost context would come back from getContext() unusable.
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [onUnsupported]);

  return <canvas ref={ref} className="size-full opacity-0 transition-opacity duration-700 ease-out" />;
}
