import { renderHook, act } from "@testing-library/react";
import useTimeSinceLast from "./useTimeSinceLast";

describe("useTimeSinceLast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a function", () => {
    const { result } = renderHook(() => useTimeSinceLast());
    expect(typeof result.current).toBe("function");
  });

  it("returns time elapsed since last call", () => {
    const { result } = renderHook(() => useTimeSinceLast());

    let elapsed: number = 0;

    // First call sets baseline
    act(() => {
      result.current();
    });

    jest.advanceTimersByTime(100);

    act(() => {
      elapsed = result.current();
    });

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it("resets timer on each call", () => {
    const { result } = renderHook(() => useTimeSinceLast());

    // First call
    act(() => {
      result.current();
    });

    jest.advanceTimersByTime(200);

    let first: number = 0;
    act(() => {
      first = result.current();
    });

    jest.advanceTimersByTime(50);

    let second: number = 0;
    act(() => {
      second = result.current();
    });

    // Second gap should be shorter than first
    expect(first).toBeGreaterThanOrEqual(200);
    expect(second).toBeGreaterThanOrEqual(50);
    expect(second).toBeLessThan(first);
  });

  it("uses initial value for first call baseline", () => {
    const now = new Date().getTime();
    const { result } = renderHook(() => useTimeSinceLast(now));

    let elapsed: number = 0;
    act(() => {
      elapsed = result.current();
    });

    // Should be near zero since initial is current time
    expect(elapsed).toBeLessThan(50);
  });

  it("defaults initial to 0", () => {
    const { result } = renderHook(() => useTimeSinceLast());

    let elapsed: number = 0;
    act(() => {
      elapsed = result.current();
    });

    // First call with initial=0 should return large number (time since epoch origin)
    expect(elapsed).toBeGreaterThan(0);
  });
});
