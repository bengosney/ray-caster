import Canvas from "./widgets/Canvas";
import "./App.css";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { rgb, lightenDarkenRGB, RGB } from "./utils/colour";
import { Vec2, addVec2, angleDegVec2, degreeToRadians, distVec2, move, subVec2, vec2, vec2Apply } from "./utils/math";
import { Texture, TextureFile, loadTexture } from "./utils/texture";

import { makeNoise2D } from "open-simplex-noise";

import brick from "./brick.png";
import floor from "./floor.png";
import useMaxSize, { ASPECT_4_3 } from "./hooks/useMaxSize";

interface ProjectionData {
  width: number;
  height: number;
  halfHeight: number;
  imageData: ImageData;
  buffer: Uint8ClampedArray;
}
interface EngineData {
  fov: number;
  precision: number;
  projection?: ProjectionData;
}

interface Sprite extends Texture {
  scale: number;
  center: number;
}

interface Entity {
  spriteID: number;
  position: Vec2;
}

interface Level {
  data: (pos: Vec2) => number;
  textures: Texture[];
  textureFiles: TextureFile[];
  sprites: Sprite[];
  entities: Entity[];
}

const noise2D = makeNoise2D(0);
const getLevelData = ({ x, y }: Vec2): number => (noise2D(x, y) > 0.5 ? 1 : 0);

const level: Level = {
  data: getLevelData,
  textures: [
    {
      width: 1,
      height: 1,
      bitmap: [[0]],
      colors: [rgb(0, 200, 0)],
    },
    {
      width: 8,
      height: 8,
      bitmap: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 0, 0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 0, 0, 0, 1, 0, 0],
      ],
      colors: [rgb(255, 241, 232), rgb(194, 195, 199)],
    },
  ],
  textureFiles: [
    { src: brick, id: 1 },
    { src: floor, id: 0 },
  ],
  sprites: [
    {
      scale: 10,
      width: 8,
      height: 8,
      center: 4.5,
      bitmap: [
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
      ],
      colors: [rgb(0, 0, 0), rgb(200, 0, 0)],
    },
  ],
  entities: [{ spriteID: 0, position: { x: 5, y: 10 } }],
};

type PlayerActions = "up" | "down" | "left" | "right" | "strafe_left" | "strafe_right";

type KeyMap = {
  [Action in PlayerActions]: string[];
};
const keys: KeyMap = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  strafe_left: ["KeyA"],
  strafe_right: ["KeyD"],
};

const actions = Object.fromEntries(
  Object.entries(keys)
    .map((mapping) => {
      const [action, keys] = mapping;
      return keys.map((key) => [key, action]);
    })
    .reduce((acc, cur) => {
      cur.forEach((i) => acc.push(i));
      return acc;
    }, []),
);

const movement = 0.005;
const rotation = 0.1;

const drawTexture = (
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
    const baseColour: RGB = texture.colors[texture.bitmap[i][absPosition]];
    const distColour: RGB = lightenDarkenRGB(baseColour, -(distance * 10));
    drawLine({ x, y }, { x, y: Math.floor(y + (yIncrement + 0.5)) }, distColour, projection);
    if (y > projection.height) {
      break;
    }
    y += yIncrement;
  }
};

const drawPixel = ({ x, y }: Vec2, color: RGB, projection: ProjectionData) => {
  if (x > projection.width || y > projection.height) {
    return;
  }
  const offset = 4 * (Math.floor(x) + Math.floor(y) * projection.width);
  projection.buffer[offset] = color.r;
  projection.buffer[offset + 1] = color.g;
  projection.buffer[offset + 2] = color.b;
  projection.buffer[offset + 3] = 255;
};

const getPixel = ({ x, y }: Vec2, projection: ProjectionData): RGB => {
  const offset = 4 * (Math.floor(x) + Math.floor(y) * projection.width);
  return rgb(projection.buffer[offset], projection.buffer[offset + 1], projection.buffer[offset + 2]);
};

const darkenPixel = (pos: Vec2, darken: number, projection: ProjectionData): void => {
  const pixel = getPixel(pos, projection);
  drawPixel(pos, lightenDarkenRGB(pixel, -darken), projection);
};

const drawLine = (p1: Vec2, p2: Vec2, colour: RGB, projection: ProjectionData) => {
  const clampY = (y: number) => Math.min(projection.height, Math.max(0, y));
  for (let y = clampY(p1.y); y < clampY(p2.y); y++) {
    const { x } = p1;
    drawPixel({ x, y }, colour, projection);
  }
};

const drawBox = (topLeft: Vec2, width: number, height: number, colour: RGB, projection: ProjectionData) => {
  for (let y = Math.max(0, topLeft.y); y < topLeft.y + height; y++) {
    for (let x = Math.max(0, topLeft.x); x < topLeft.x + width; x++) {
      drawPixel({ x, y }, colour, projection);
    }
  }
};

const drawFloor = (x: number, wallHeight: number, player: Player, rayAngle: number, projection: ProjectionData) => {
  const halfHeight = projection.halfHeight;
  const start = halfHeight + wallHeight + 1;
  const directionCos = Math.cos(degreeToRadians(rayAngle));
  const directionSin = Math.sin(degreeToRadians(rayAngle));

  let y = start;
  const wallAO = 30;
  const wallAOFactor = wallAO / (wallHeight * 0.05);
  for (let ao = wallAO; ao > 0; ao -= wallAOFactor) {
    y -= 1;
    darkenPixel({ x, y }, ao, projection);
    ao -= wallAOFactor;
  }

  const aoFactor = 1.9;
  let ao = 50;

  for (let y = start; y < projection.height; y++) {
    const distance = projection.height / (2 * y - projection.height);
    const correctDistance = distance / Math.cos(degreeToRadians(player.angle) - degreeToRadians(rayAngle));

    const tileX = correctDistance * directionCos + player.pos.x / 2;
    const tileY = correctDistance * directionSin + player.pos.y / 2;

    const texture = level.textures[0];
    if (!texture) {
    }

    const textureX = Math.abs(Math.floor(tileX * texture.width) % texture.width);
    const textureY = Math.abs(Math.floor(tileY * texture.height) % texture.height);

    const baseColour: RGB = texture.colors[texture.bitmap[textureX][textureY]];
    const distColour: RGB = lightenDarkenRGB(baseColour, -(distance * 15 + ao));
    drawPixel({ x, y }, distColour, projection);
    ao = Math.max(ao - aoFactor, 0);
  }
};

const drawSprite = (sprite: Sprite, position: Vec2, distance: number, projection: ProjectionData) => {
  const { scale: spriteScale, bitmap, colors, height, width, center } = sprite;
  const scale = spriteScale - distance;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colourIdx = bitmap[y][x];

      const scaledX = (x - center) * scale + position.x;
      const scaledY = y * scale + (projection.halfHeight + position.y - height * scale);

      drawBox(vec2(scaledX, scaledY), scale, scale, colors[colourIdx], projection);
    }
  }
};

interface Player {
  pos: Vec2;
  angle: number;
  keys: Set<PlayerActions>;
}

const checkMove = (move: Vec2) => {
  const { x, y } = vec2Apply(move, Math.floor);
  return level.data({ x, y }) === 0;
};

function App() {
  const player = useRef<Player>({
    pos: vec2(5, 5),
    angle: 220,
    keys: new Set<PlayerActions>(),
  });
  const fpsCounter = useRef<number>(0);
  const { width, height } = useMaxSize(ASPECT_4_3);

  const engineDataRef = useRef<EngineData>({
    fov: 60,
    precision: 64,
  });

  const Control = useCallback(
    ({ action, children }: { action: PlayerActions; children: ReactNode }) => (
      <button
        onTouchStart={() => player.current.keys.add(action)}
        onMouseDown={() => player.current.keys.add(action)}
        onTouchEnd={() => player.current.keys.delete(action)}
        onMouseUp={() => player.current.keys.delete(action)}
      >
        {children}
      </button>
    ),
    [],
  );

  useEffect(() => {
    document.addEventListener("keydown", (event) => {
      const { code } = event;
      if (code in actions) {
        player.current.keys.add(actions[code]);
      }
    });
    document.addEventListener("keyup", (event) => {
      const { code } = event;
      player.current.keys.delete(actions[code]);
    });

    level.textureFiles.forEach(({ src, id }) => loadTexture(src).then((texture) => (level.textures[id] = texture)));
  }, []);

  const getMove = (since: number, direction: number): Vec2 => {
    const { pos, angle: _angle } = player.current;
    const angle = _angle + direction;
    const { x, y } = addVec2(pos, move(angle, movement * since));

    if (checkMove({ x, y })) {
      return { x, y };
    } else {
      const { x, y } = addVec2(pos, move(angle, movement * 0.75 * since));

      if (checkMove({ x, y: pos.y })) {
        return { x, y: pos.y };
      }
      if (checkMove({ x: pos.x, y })) {
        return { x: pos.x, y };
      }
    }

    return pos;
  };

  const init = useCallback((context: CanvasRenderingContext2D) => {
    context.scale(1, 1);
    context.translate(0.5, 0.5);
    const width = Math.floor(context.canvas.width);
    const height = Math.floor(context.canvas.height);
    const imageData = context.createImageData(width, height);
    const buffer = imageData.data;
    const halfHeight = height / 2;

    engineDataRef.current.projection = { width, height, halfHeight, imageData, buffer };
  }, []);

  const frame = useCallback((context: CanvasRenderingContext2D, since: number) => {
    const { pos, angle } = player.current;
    const engineData = engineDataRef.current;
    const { projection } = engineData;

    if (!projection) {
      throw new Error("Projection not initialized");
    }

    player.current.keys.forEach((action) => {
      switch (action) {
        case "up":
          player.current.pos = getMove(since, 0);
          break;
        case "down":
          player.current.pos = getMove(since, 180);
          break;
        case "left":
          player.current.angle -= rotation * since;
          break;
        case "right":
          player.current.angle += rotation * since;
          break;
        case "strafe_left":
          player.current.pos = getMove(since, -90);
          break;
        case "strafe_right":
          player.current.pos = getMove(since, 90);
          break;
      }
    });

    const angleInc = engineData.fov / projection.width;
    const initalAngle = angle - engineData.fov / 2;
    const halfHeight = projection.halfHeight;

    const depthMap = [];

    for (let i = 0; i < projection.width; i++) {
      const rayAngle = initalAngle + angleInc * i;
      const ray = vec2(pos.x, pos.y);
      const rayCos = Math.cos(degreeToRadians(rayAngle)) / engineData.precision;
      const raySin = Math.sin(degreeToRadians(rayAngle)) / engineData.precision;

      let tests = 0;
      while (level.data(vec2(Math.floor(ray.x), Math.floor(ray.y))) === 0 && tests < 1250) {
        ray.x += rayCos;
        ray.y += raySin;
        tests++;
      }
      const wallID = level.data(vec2(Math.floor(ray.x), Math.floor(ray.y)));

      const distance = Math.sqrt(Math.pow(pos.x - ray.x, 2) + Math.pow(pos.y - ray.y, 2));
      const correctDistance = distance * Math.cos(degreeToRadians(rayAngle - angle));
      depthMap[i] = correctDistance;
      const wallHeight = Math.floor(projection.height / correctDistance);

      drawLine(vec2(i, 0), vec2(i, halfHeight - wallHeight), rgb(0, 200, 200), projection);

      const texture = level.textures[wallID];
      const textureX = Math.floor((ray.y + ray.x) * texture.width) % texture.width;
      drawTexture(i, wallHeight, textureX, texture, distance, projection);

      drawFloor(i, wallHeight, player.current, rayAngle, projection);
    }

    const wrappedAngle = angle % 360;
    const pixelPerDeg = projection.width / engineData.fov;
    const halfFOV = engineData.fov / 2;
    level.entities.forEach((entity) => {
      const angleTo = angleDegVec2(pos, entity.position);
      const diff = angleTo - wrappedAngle;
      const distance = distVec2(entity.position, pos);
      const correctDistance = distance;
      const height = Math.floor(projection.height / correctDistance);
      const x = (halfFOV + diff) * pixelPerDeg;

      drawSprite(level.sprites[entity.spriteID], vec2(x, height), correctDistance, projection);
    });

    const renderCanvas = document.createElement("canvas");
    renderCanvas.width = projection.width;
    renderCanvas.height = projection.height;
    const renderContext = renderCanvas.getContext("2d");

    renderContext?.putImageData(projection.imageData, 0, 0);
    context.drawImage(renderCanvas, 0, 0);

    fpsCounter.current = fpsCounter.current + 1;
  }, []);

  return (
    <div>
      <div>
        <Canvas
          animating={true}
          width={width}
          height={height}
          init={init}
          frame={frame}
        />
      </div>
      <div className="buttons">
        <div></div>
        <div>
          <Control action="up">Forward</Control>
        </div>
        <div></div>
        <div>
          <Control action="left">Left</Control>
        </div>
        <div>
          <Control action="down">Backward</Control>
        </div>
        <div>
          <Control action="right">Right</Control>
        </div>
      </div>
    </div>
  );
}

export default App;
