import { RGBA, lightenDarkenRGB } from "./colour";
import { Vec2, cosFromDegree, sinFromDegree, vec2 } from "./math";
import { Texture, Sprite } from "./texture";

const REFERENCE_HEIGHT = 50;

export interface ProjectionData {
  width: number;
  height: number;
  halfHeight: number;
  imageData: ImageData;
  buffer: Uint8ClampedArray;
}

export const drawPixel = ({ x, y }: Vec2, color: RGBA, projection: ProjectionData) => {
  if (x < 0 || y < 0 || x >= projection.width || y >= projection.height) {
    return;
  }
  const offset = 4 * (Math.floor(x) + Math.floor(y) * projection.width);
  const { r, g, b, a } = color;
  const ia = 255 - a;
  projection.buffer[offset] = (r * a + projection.buffer[offset] * ia) / 255;
  projection.buffer[offset + 1] = (g * a + projection.buffer[offset + 1] * ia) / 255;
  projection.buffer[offset + 2] = (b * a + projection.buffer[offset + 2] * ia) / 255;
  projection.buffer[offset + 3] = 255;
};

export const getPixel = ({ x, y }: Vec2, projection: ProjectionData): RGBA => {
  const offset = 4 * (Math.floor(x) + Math.floor(y) * projection.width);
  return {
    r: projection.buffer[offset],
    g: projection.buffer[offset + 1],
    b: projection.buffer[offset + 2],
    a: projection.buffer[offset + 3],
  };
};

export const darkenPixel = (pos: Vec2, darken: number, projection: ProjectionData): void => {
  const pixel = getPixel(pos, projection);
  drawPixel(pos, lightenDarkenRGB(pixel, -darken), projection);
};

export const drawLine = (p1: Vec2, p2: Vec2, colour: RGBA, projection: ProjectionData) => {
  const clampY = (y: number) => Math.min(projection.height, Math.max(0, y));
  for (let y = clampY(p1.y); y < clampY(p2.y); y++) {
    const { x } = p1;
    drawPixel({ x, y }, colour, projection);
  }
};

export const drawBox = (topLeft: Vec2, width: number, height: number, colour: RGBA, projection: ProjectionData) => {
  for (let y = Math.max(0, topLeft.y); y < topLeft.y + height; y++) {
    for (let x = Math.max(0, topLeft.x); x < topLeft.x + width; x++) {
      drawPixel({ x, y }, colour, projection);
    }
  }
};

export const drawTexture = (
  x: number,
  wallHeight: number,
  texturePositionX: number,
  texture: Texture,
  distance: number,
  projection: ProjectionData,
): void => {
  const yIncrement: number = (wallHeight * 2) / texture.height;
  let y: number = projection.halfHeight - wallHeight;
  const absPosition = Math.abs(texturePositionX);

  for (let i = 0; i < texture.height; i++) {
    const baseColour = texture.colors[texture.bitmap[i][absPosition]];
    const distColour = lightenDarkenRGB(baseColour, -(distance * 10));
    drawLine({ x, y }, { x, y: Math.floor(y + (yIncrement + 0.5)) }, distColour, projection);
    if (y > projection.height) {
      break;
    }
    y += yIncrement;
  }
};

export const drawFloor = (
  x: number,
  wallHeight: number,
  player: { pos: Vec2; angle: number },
  rayAngle: number,
  floorTexture: Texture,
  projection: ProjectionData,
) => {
  const halfHeight = projection.halfHeight;
  const start = halfHeight + wallHeight + 1;
  const directionCos = cosFromDegree(rayAngle);
  const directionSin = sinFromDegree(rayAngle);

  let y = start;
  const wallAO = 30;
  const wallAOFactor = wallAO / (wallHeight * 0.025);
  for (let ao = wallAO; ao > 0; ao -= wallAOFactor) {
    y -= 1;
    darkenPixel({ x, y }, ao, projection);
  }

  const aoFactor = 1.9;
  let ao = 50;

  for (let y = start; y < projection.height; y++) {
    const distance = projection.height / (2 * y - projection.height);
    const correctDistance = distance / cosFromDegree(player.angle - rayAngle);

    const tileX = correctDistance * directionCos + player.pos.x / 2;
    const tileY = correctDistance * directionSin + player.pos.y / 2;

    const textureX = Math.abs(Math.floor(tileX * floorTexture.width) % floorTexture.width);
    const textureY = Math.abs(Math.floor(tileY * floorTexture.height) % floorTexture.height);

    const baseColour = floorTexture.colors[floorTexture.bitmap[textureX][textureY]];
    const distColour = lightenDarkenRGB(baseColour, -(distance * 15 + ao));
    drawPixel({ x, y }, distColour, projection);
    ao = Math.max(ao - aoFactor, 0);
  }
};

export const drawSprite = (
  sprite: Sprite,
  position: Vec2,
  distance: number,
  depthMap: number[],
  projection: ProjectionData,
) => {
  const { scale: spriteScale, bitmap, colors, height, width, center } = sprite;
  const scale = (spriteScale * projection.height) / (REFERENCE_HEIGHT * distance);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colourIdx = bitmap[y][x];

      const scaledX = (x - center) * scale + position.x;
      const scaledY = y * scale + (projection.halfHeight + position.y - height * scale);

      const screenCol = Math.floor(scaledX);
      if (screenCol >= 0 && screenCol < projection.width && distance < depthMap[screenCol]) {
        drawBox(vec2(scaledX, scaledY), scale, scale, colors[colourIdx], projection);
      }
    }
  }
};
