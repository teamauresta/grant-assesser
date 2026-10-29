// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import AuroraCanvas from '@/components/home/aurora-canvas';

afterEach(() => vi.restoreAllMocks());

describe('AuroraCanvas', () => {
  // The contour shader needs fwidth(): a GPU without OES_standard_derivatives gets the still rings,
  // not a shader that fails to compile.
  it('reports unsupported and compiles nothing when OES_standard_derivatives is missing', () => {
    const createShader = vi.fn(() => ({}));
    const compileShader = vi.fn();
    const gl = {
      getExtension: vi.fn(() => null),
      createShader,
      compileShader,
      shaderSource: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => ({})),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => gl) as never);
    const onUnsupported = vi.fn();
    render(<AuroraCanvas playing onUnsupported={onUnsupported} onLost={() => {}} />);
    expect(gl.getExtension).toHaveBeenCalledWith('OES_standard_derivatives');
    expect(onUnsupported).toHaveBeenCalledTimes(1);
    expect(createShader).not.toHaveBeenCalled();
    expect(compileShader).not.toHaveBeenCalled();
  });
});
