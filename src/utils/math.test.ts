import { vec2, degreeToRadians, move, vec2Apply, addVec2, subVec2, distVec2, angleRadVec2, angleDegVec2 } from "./math";

describe("vec2", () => {
  it("creates vector with x and y", () => {
    expect(vec2(3, 7)).toEqual({ x: 3, y: 7 });
  });
});

describe("degreeToRadians", () => {
  it("converts 0 degrees", () => {
    expect(degreeToRadians(0)).toBe(0);
  });

  it("converts 180 degrees to pi", () => {
    expect(degreeToRadians(180)).toBeCloseTo(Math.PI);
  });

  it("converts 90 degrees to pi/2", () => {
    expect(degreeToRadians(90)).toBeCloseTo(Math.PI / 2);
  });

  it("converts 360 degrees to 2*pi", () => {
    expect(degreeToRadians(360)).toBeCloseTo(2 * Math.PI);
  });

  it("handles negative degrees", () => {
    expect(degreeToRadians(-90)).toBeCloseTo(-Math.PI / 2);
  });
});

describe("move", () => {
  it("moves right at 0 degrees", () => {
    const result = move(0, 5);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(0);
  });

  it("moves up at 90 degrees", () => {
    const result = move(90, 5);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(5);
  });

  it("moves left at 180 degrees", () => {
    const result = move(180, 5);
    expect(result.x).toBeCloseTo(-5);
    expect(result.y).toBeCloseTo(0);
  });

  it("respects amount", () => {
    const result = move(0, 10);
    expect(result.x).toBeCloseTo(10);
  });
});

describe("vec2Apply", () => {
  it("applies function to both components", () => {
    expect(vec2Apply(vec2(2.7, 3.2), Math.floor)).toEqual({ x: 2, y: 3 });
  });

  it("works with Math.abs", () => {
    expect(vec2Apply(vec2(-5, -3), Math.abs)).toEqual({ x: 5, y: 3 });
  });
});

describe("addVec2", () => {
  it("adds two vectors", () => {
    expect(addVec2(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
  });

  it("handles negatives", () => {
    expect(addVec2(vec2(5, 5), vec2(-3, -2))).toEqual({ x: 2, y: 3 });
  });
});

describe("subVec2", () => {
  it("subtracts two vectors", () => {
    expect(subVec2(vec2(5, 7), vec2(2, 3))).toEqual({ x: 3, y: 4 });
  });

  it("can produce negative results", () => {
    expect(subVec2(vec2(1, 1), vec2(5, 5))).toEqual({ x: -4, y: -4 });
  });
});

describe("distVec2", () => {
  it("returns 0 for same point", () => {
    expect(distVec2(vec2(3, 3), vec2(3, 3))).toBe(0);
  });

  it("calculates horizontal distance", () => {
    expect(distVec2(vec2(0, 0), vec2(5, 0))).toBe(5);
  });

  it("calculates diagonal distance", () => {
    expect(distVec2(vec2(0, 0), vec2(3, 4))).toBe(5);
  });
});

describe("angleRadVec2", () => {
  it("returns 0 for point directly right", () => {
    expect(angleRadVec2(vec2(0, 0), vec2(5, 0))).toBeCloseTo(0);
  });

  it("returns pi/2 for point directly below", () => {
    expect(angleRadVec2(vec2(0, 0), vec2(0, 5))).toBeCloseTo(Math.PI / 2);
  });

  it("returns pi for point directly left", () => {
    expect(Math.abs(angleRadVec2(vec2(0, 0), vec2(-5, 0)))).toBeCloseTo(Math.PI);
  });
});

describe("angleDegVec2", () => {
  it("returns 0 for point directly right", () => {
    expect(angleDegVec2(vec2(0, 0), vec2(5, 0))).toBeCloseTo(0);
  });

  it("returns 90 for point directly below", () => {
    expect(angleDegVec2(vec2(0, 0), vec2(0, 5))).toBeCloseTo(90);
  });

  it("returns 45 for diagonal", () => {
    expect(angleDegVec2(vec2(0, 0), vec2(5, 5))).toBeCloseTo(45);
  });
});
