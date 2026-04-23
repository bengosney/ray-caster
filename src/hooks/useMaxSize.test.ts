import useMaxSize, { ASPECT_4_3, ASPECT_16_9, ASPECT_16_10 } from "./useMaxSize";
import { renderHook } from "@testing-library/react";

describe("aspect ratio constants", () => {
  it("ASPECT_4_3 is approximately 4/3", () => {
    expect(ASPECT_4_3).toBeCloseTo(4 / 3);
  });

  it("ASPECT_16_9 is approximately 16/9", () => {
    expect(ASPECT_16_9).toBeCloseTo(16 / 9);
  });

  it("ASPECT_16_10 is approximately 16/10", () => {
    expect(ASPECT_16_10).toBeCloseTo(16 / 10);
  });
});

describe("useMaxSize", () => {
  const setWindowSize = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", { value: width, writable: true });
    Object.defineProperty(window, "innerHeight", { value: height, writable: true });
  };

  it("returns width and height", () => {
    setWindowSize(1024, 768);
    const { result } = renderHook(() => useMaxSize(ASPECT_4_3));

    expect(result.current).toHaveProperty("width");
    expect(result.current).toHaveProperty("height");
  });

  it("height does not exceed 80% of window height", () => {
    setWindowSize(1920, 1080);
    const { result } = renderHook(() => useMaxSize(ASPECT_4_3));

    expect(result.current.height).toBeLessThanOrEqual(1080 * 0.8);
  });

  it("maintains aspect ratio", () => {
    setWindowSize(1024, 768);
    const { result } = renderHook(() => useMaxSize(ASPECT_4_3));

    const actualAspect = result.current.width / result.current.height;
    expect(actualAspect).toBeCloseTo(ASPECT_4_3, 0);
  });

  it("fits within window width", () => {
    setWindowSize(800, 600);
    const { result } = renderHook(() => useMaxSize(ASPECT_4_3));

    expect(result.current.width).toBeLessThanOrEqual(800);
  });

  it("works with different aspect ratios", () => {
    setWindowSize(1920, 1080);

    const { result: r43 } = renderHook(() => useMaxSize(ASPECT_4_3));
    const { result: r169 } = renderHook(() => useMaxSize(ASPECT_16_9));

    // 16:9 is wider, so at same height constraint it should be wider
    expect(r169.current.width).toBeGreaterThanOrEqual(r43.current.width);
  });

  it("adapts to small windows", () => {
    setWindowSize(400, 300);
    const { result } = renderHook(() => useMaxSize(ASPECT_4_3));

    expect(result.current.width).toBeGreaterThan(0);
    expect(result.current.height).toBeGreaterThan(0);
    expect(result.current.height).toBeLessThanOrEqual(300 * 0.8);
  });
});
