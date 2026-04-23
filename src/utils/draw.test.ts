import {
  drawPixel,
  getPixel,
  darkenPixel,
  drawLine,
  drawBox,
  drawTexture,
  drawFloor,
  drawSprite,
  ProjectionData,
} from "./draw";
import { rgba } from "./colour";
import { Sprite, Texture } from "./texture";
import { vec2 } from "./math";

const makeProjection = (width: number, height: number): ProjectionData => {
  const buffer = new Uint8ClampedArray(width * height * 4);
  return {
    width,
    height,
    halfHeight: height / 2,
    imageData: { data: buffer, width, height, colorSpace: "srgb" } as ImageData,
    buffer,
  };
};

const makeSprite = (scale: number): Sprite => ({
  scale,
  width: 2,
  height: 2,
  center: 1,
  bitmap: [
    [1, 1],
    [1, 1],
  ],
  colors: [rgba(0, 0, 0, 0), rgba(255, 0, 0, 255)],
  src: "",
});

const makeTexture = (): Texture => ({
  width: 4,
  height: 4,
  bitmap: [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
  ],
  colors: [rgba(100, 100, 100, 255), rgba(200, 200, 200, 255)],
  src: "",
});

const filledPixelCount = (projection: ProjectionData): number => {
  let count = 0;
  for (let i = 3; i < projection.buffer.length; i += 4) {
    if (projection.buffer[i] > 0) count++;
  }
  return count;
};

describe("drawPixel", () => {
  it("writes RGBA to buffer at correct offset", () => {
    const projection = makeProjection(10, 10);
    drawPixel(vec2(3, 2), rgba(255, 128, 64, 255), projection);

    const offset = 4 * (3 + 2 * 10);
    expect(projection.buffer[offset]).toBe(255);
    expect(projection.buffer[offset + 1]).toBe(128);
    expect(projection.buffer[offset + 2]).toBe(64);
    expect(projection.buffer[offset + 3]).toBe(255);
  });

  it("alpha blends with existing pixel", () => {
    const projection = makeProjection(10, 10);
    // Draw opaque white first
    drawPixel(vec2(0, 0), rgba(255, 255, 255, 255), projection);
    // Draw 50% alpha black on top
    drawPixel(vec2(0, 0), rgba(0, 0, 0, 128), projection);

    const pixel = getPixel(vec2(0, 0), projection);
    // Should be roughly mid-gray
    expect(pixel.r).toBeGreaterThan(100);
    expect(pixel.r).toBeLessThan(150);
  });

  it("skips pixels outside bounds", () => {
    const projection = makeProjection(10, 10);
    drawPixel(vec2(15, 5), rgba(255, 0, 0, 255), projection);
    drawPixel(vec2(5, 15), rgba(255, 0, 0, 255), projection);

    expect(filledPixelCount(projection)).toBe(0);
  });

  it("floors fractional coordinates", () => {
    const projection = makeProjection(10, 10);
    drawPixel(vec2(2.7, 3.9), rgba(255, 0, 0, 255), projection);

    const pixel = getPixel(vec2(2, 3), projection);
    expect(pixel.r).toBe(255);
    expect(pixel.a).toBe(255);
  });
});

describe("getPixel", () => {
  it("reads back what was written", () => {
    const projection = makeProjection(10, 10);
    drawPixel(vec2(5, 5), rgba(10, 20, 30, 255), projection);

    const pixel = getPixel(vec2(5, 5), projection);
    expect(pixel).toEqual({ r: 10, g: 20, b: 30, a: 255 });
  });

  it("returns zeros for empty pixel", () => {
    const projection = makeProjection(10, 10);
    const pixel = getPixel(vec2(0, 0), projection);
    expect(pixel).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
});

describe("darkenPixel", () => {
  it("reduces RGB values", () => {
    const projection = makeProjection(10, 10);
    drawPixel(vec2(0, 0), rgba(200, 200, 200, 255), projection);

    darkenPixel(vec2(0, 0), 50, projection);

    const pixel = getPixel(vec2(0, 0), projection);
    expect(pixel.r).toBe(150);
    expect(pixel.g).toBe(150);
    expect(pixel.b).toBe(150);
  });

  it("clamps to zero, not negative", () => {
    const projection = makeProjection(10, 10);
    drawPixel(vec2(0, 0), rgba(30, 30, 30, 255), projection);

    darkenPixel(vec2(0, 0), 100, projection);

    const pixel = getPixel(vec2(0, 0), projection);
    expect(pixel.r).toBe(0);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
  });
});

describe("drawLine", () => {
  it("draws vertical line between two y values", () => {
    const projection = makeProjection(10, 10);
    drawLine(vec2(5, 2), vec2(5, 6), rgba(255, 0, 0, 255), projection);

    // Pixels at y=2,3,4,5 should be filled (not y=6, exclusive end)
    for (let y = 2; y < 6; y++) {
      expect(getPixel(vec2(5, y), projection).a).toBe(255);
    }
    // y=1 and y=6 should be empty
    expect(getPixel(vec2(5, 1), projection).a).toBe(0);
    expect(getPixel(vec2(5, 6), projection).a).toBe(0);
  });

  it("clamps to projection bounds", () => {
    const projection = makeProjection(10, 10);
    // Line extending past canvas
    drawLine(vec2(5, -5), vec2(5, 20), rgba(255, 0, 0, 255), projection);

    // Should have pixels at valid y range only, no crash
    expect(getPixel(vec2(5, 0), projection).a).toBe(255);
    expect(getPixel(vec2(5, 9), projection).a).toBe(255);
  });
});

describe("drawBox", () => {
  it("fills rectangular area", () => {
    const projection = makeProjection(20, 20);
    drawBox(vec2(5, 5), 3, 4, rgba(255, 0, 0, 255), projection);

    let count = 0;
    for (let y = 5; y < 9; y++) {
      for (let x = 5; x < 8; x++) {
        expect(getPixel(vec2(x, y), projection).a).toBe(255);
        count++;
      }
    }
    expect(count).toBe(12); // 3 * 4

    // Outside box should be empty
    expect(getPixel(vec2(4, 5), projection).a).toBe(0);
    expect(getPixel(vec2(8, 5), projection).a).toBe(0);
  });

  it("clamps negative topLeft to zero", () => {
    const projection = makeProjection(10, 10);
    drawBox(vec2(-2, -2), 5, 5, rgba(255, 0, 0, 255), projection);

    // Should draw from 0,0 to 3,3 (the visible part)
    expect(getPixel(vec2(0, 0), projection).a).toBe(255);
    expect(getPixel(vec2(2, 2), projection).a).toBe(255);
    expect(filledPixelCount(projection)).toBeGreaterThan(0);
  });
});

describe("drawTexture", () => {
  it("draws vertical stripe of texture column", () => {
    const projection = makeProjection(100, 100);
    const texture = makeTexture();

    drawTexture(50, 30, 0, texture, 1, projection);

    // Should have pixels drawn along x=50
    let columnPixels = 0;
    for (let y = 0; y < 100; y++) {
      if (getPixel(vec2(50, y), projection).a > 0) columnPixels++;
    }
    expect(columnPixels).toBeGreaterThan(0);
  });

  it("darkens pixels with distance", () => {
    const projection1 = makeProjection(100, 100);
    const projection2 = makeProjection(100, 100);
    const texture = makeTexture();

    drawTexture(50, 30, 0, texture, 1, projection1);
    drawTexture(50, 30, 0, texture, 5, projection2);

    // Find a filled pixel in both and compare brightness
    let nearPixel = { r: 0, g: 0, b: 0, a: 0 };
    let farPixel = { r: 0, g: 0, b: 0, a: 0 };
    for (let y = 0; y < 100; y++) {
      const p1 = getPixel(vec2(50, y), projection1);
      const p2 = getPixel(vec2(50, y), projection2);
      if (p1.a > 0 && p2.a > 0) {
        nearPixel = p1;
        farPixel = p2;
        break;
      }
    }
    expect(nearPixel.r).toBeGreaterThan(farPixel.r);
  });
});

describe("drawFloor", () => {
  it("draws pixels below wall height", () => {
    const projection = makeProjection(100, 100);
    const texture = makeTexture();
    const player = { pos: vec2(5, 5), angle: 0 };

    drawFloor(50, 10, player, 0, texture, projection);

    // Pixels below halfHeight + wallHeight should be filled
    let floorPixels = 0;
    for (let y = 61; y < 100; y++) {
      if (getPixel(vec2(50, y), projection).a > 0) floorPixels++;
    }
    expect(floorPixels).toBeGreaterThan(0);
  });

  it("does not draw above wall", () => {
    const projection = makeProjection(100, 100);
    const texture = makeTexture();
    const player = { pos: vec2(5, 5), angle: 0 };

    drawFloor(50, 10, player, 0, texture, projection);

    // Well above the wall should be empty
    for (let y = 0; y < 30; y++) {
      expect(getPixel(vec2(50, y), projection).a).toBe(0);
    }
  });
});

describe("drawSprite", () => {
  it("draws pixels to buffer", () => {
    const projection = makeProjection(100, 100);
    const sprite = makeSprite(4);
    const depthMap = new Array(100).fill(Infinity);

    drawSprite(sprite, vec2(50, 0), 1, depthMap, projection);

    expect(filledPixelCount(projection)).toBeGreaterThan(0);
  });

  it("scale is proportional to canvas height", () => {
    const sprite = makeSprite(4);
    const distance = 2;
    const depthMap = new Array(400).fill(Infinity);

    const smallProjection = makeProjection(400, 100);
    drawSprite(sprite, vec2(200, 0), distance, depthMap, smallProjection);
    const smallPixels = filledPixelCount(smallProjection);

    const largeProjection = makeProjection(400, 200);
    drawSprite(sprite, vec2(200, 0), distance, depthMap, largeProjection);
    const largePixels = filledPixelCount(largeProjection);

    // Doubling height should roughly quadruple pixels (2x scale in both dimensions)
    expect(largePixels).toBeGreaterThan(smallPixels);
    expect(largePixels / smallPixels).toBeCloseTo(4, 0);
  });

  it("does not draw behind walls (depth test)", () => {
    const projection = makeProjection(100, 100);
    const sprite = makeSprite(4);
    // Wall closer than sprite
    const depthMap = new Array(100).fill(0.5);

    drawSprite(sprite, vec2(50, 0), 1, depthMap, projection);

    expect(filledPixelCount(projection)).toBe(0);
  });

  it("does not draw off-screen sprites", () => {
    const projection = makeProjection(100, 100);
    const sprite = makeSprite(4);
    const depthMap = new Array(100).fill(Infinity);

    drawSprite(sprite, vec2(-500, 0), 1, depthMap, projection);

    expect(filledPixelCount(projection)).toBe(0);
  });

  it("larger distance produces fewer pixels", () => {
    const sprite = makeSprite(4);
    const depthMap = new Array(200).fill(Infinity);

    const nearProjection = makeProjection(200, 200);
    drawSprite(sprite, vec2(100, 0), 1, depthMap, nearProjection);
    const nearPixels = filledPixelCount(nearProjection);

    const farProjection = makeProjection(200, 200);
    drawSprite(sprite, vec2(100, 0), 3, depthMap, farProjection);
    const farPixels = filledPixelCount(farProjection);

    expect(nearPixels).toBeGreaterThan(farPixels);
  });

  it("same relative size at different canvas heights", () => {
    const sprite = makeSprite(4);
    const distance = 2;

    // Small canvas
    const small = makeProjection(200, 100);
    const smallDepth = new Array(200).fill(Infinity);
    drawSprite(sprite, vec2(100, 0), distance, smallDepth, small);
    const smallRatio = filledPixelCount(small) / (200 * 100);

    // Large canvas
    const large = makeProjection(400, 200);
    const largeDepth = new Array(400).fill(Infinity);
    drawSprite(sprite, vec2(200, 0), distance, largeDepth, large);
    const largeRatio = filledPixelCount(large) / (400 * 200);

    // Pixel ratio (proportion of screen covered) should be similar
    expect(largeRatio / smallRatio).toBeCloseTo(1, 0);
  });
});
