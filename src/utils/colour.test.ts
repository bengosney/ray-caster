import { rgba, rgb, RGBToHex, lightenDarkenRGB } from "./colour";

describe("rgba", () => {
  it("creates RGBA object", () => {
    expect(rgba(10, 20, 30, 128)).toEqual({ r: 10, g: 20, b: 30, a: 128 });
  });
});

describe("rgb", () => {
  it("creates RGBA with alpha 255", () => {
    expect(rgb(10, 20, 30)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
  });
});

describe("RGBToHex", () => {
  it("converts black", () => {
    expect(RGBToHex(rgba(0, 0, 0, 255))).toBe("#000000");
  });

  it("converts white", () => {
    expect(RGBToHex(rgba(255, 255, 255, 255))).toBe("#ffffff");
  });

  it("converts red", () => {
    expect(RGBToHex(rgba(255, 0, 0, 255))).toBe("#ff0000");
  });

  it("converts arbitrary color", () => {
    expect(RGBToHex(rgba(18, 52, 86, 255))).toBe("#123456");
  });
});

describe("lightenDarkenRGB", () => {
  it("lightens color", () => {
    const result = lightenDarkenRGB(rgba(100, 100, 100, 255), 50);
    expect(result).toEqual({ r: 150, g: 150, b: 150, a: 255 });
  });

  it("darkens color", () => {
    const result = lightenDarkenRGB(rgba(100, 100, 100, 255), -50);
    expect(result).toEqual({ r: 50, g: 50, b: 50, a: 255 });
  });

  it("clamps to 255", () => {
    const result = lightenDarkenRGB(rgba(200, 200, 200, 255), 100);
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });

  it("clamps to 0", () => {
    const result = lightenDarkenRGB(rgba(30, 30, 30, 255), -100);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("preserves alpha", () => {
    const result = lightenDarkenRGB(rgba(100, 100, 100, 128), 50);
    expect(result.a).toBe(128);
  });
});
