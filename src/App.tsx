import Canvas from "./widgets/Canvas";
import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { rgb, lightenDarkenRGB, RGB } from "./utils/colour";
import { Vec2, addVec2, degreeToRadians, move, subVec2, vec2, vec2Apply } from "./utils/math";
import { Texture, TextureFile, loadTexture } from "./utils/texture";
import { Data2D } from "./types/types";

import brick from "./brick.png";
import floor from "./floor.png";
import { useMemo } from "react";

interface ProjectionData {
  width: number;
  height: number;
  imageData: ImageData;
  buffer: Uint8ClampedArray;
}
interface EngineData {
  fov: number;
  precision: number;
  scale: number;
  projection?: ProjectionData;
}

interface Level {
  data: Data2D;
  textures: Texture[];
  textureFiles: TextureFile[];
}

const level: Level = {
  data: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
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
};

type PlayerActions = "up" | "down" | "left" | "right";

type KeyMap = {
  [Action in PlayerActions]: string[];
};
const keys: KeyMap = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
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

const drawTexture_old = (
  x: number,
  wallHeight: number,
  texturePositionX: number,
  texture: Texture,
  distance: number,
  projection: ProjectionData,
): void => {
  const yIncrement: number = (wallHeight * 2) / texture.height;
  let y: number = projection.height / 2 - wallHeight;

  for (let i = 0; i < texture.height; i++) {
    const baseColour: RGB = texture.colors[texture.bitmap[i][texturePositionX]];
    const distColour: RGB = lightenDarkenRGB(baseColour, -(distance * 10));
    drawLine({ x, y }, { x, y: Math.floor(y + (yIncrement + 0.5)) }, distColour, projection);
    if (y > projection.height) {
      break;
    }
    y += yIncrement;
  }
};

const drawTexture = (
  x: number,
  wallHeight: number,
  texturePositionX: number,
  texture: Texture,
  distance: number,
  projection: ProjectionData,
): void => {
  const from = projection.height / 2 - wallHeight;
  const to = from + wallHeight * 2;
  const textureInc = texture.height / (wallHeight * 2 + 1);

  for (let y = from; y <= to; y++) {
    const textureY = Math.floor((y - from) * textureInc);
    const baseColour: RGB = texture.colors[texture.bitmap[textureY][texturePositionX]];
    const distColour: RGB = lightenDarkenRGB(baseColour, -(distance * 10));
    drawPixel({ x, y }, distColour, projection);
  }
};

const drawPixel = ({ x, y }: Vec2, color: RGB, projection: ProjectionData) => {
  const offset = 4 * (Math.floor(x) + Math.floor(y) * projection.width);
  projection.buffer[offset] = color.r;
  projection.buffer[offset + 1] = color.g;
  projection.buffer[offset + 2] = color.b;
  projection.buffer[offset + 3] = 255;
};

const drawLine = (p1: Vec2, p2: Vec2, colour: RGB, projection: ProjectionData) => {
  const clampY = (y: number) => Math.min(projection.height, Math.max(0, y));
  for (let y = clampY(p1.y); y < clampY(p2.y); y++) {
    const { x } = p1;
    drawPixel({ x, y }, colour, projection);
  }
};

const drawFloor = (x: number, wallHeight: number, player: Player, rayAngle: number, projection: ProjectionData) => {
  const start = projection.height / 2 + wallHeight + 1;
  const directionCos = Math.cos(degreeToRadians(rayAngle));
  const directionSin = Math.sin(degreeToRadians(rayAngle));

  let ao = 50;
  const aoFactor = 1.9;

  for (let y = start; y < projection.height; y++) {
    const distance = projection.height / (2 * y - projection.height);
    const correctDistance = distance / Math.cos(degreeToRadians(player.angle) - degreeToRadians(rayAngle));

    const tileX = correctDistance * directionCos + player.pos.x / 2;
    const tileY = correctDistance * directionSin + player.pos.y / 2;

    const texture = level.textures[0];
    if (!texture) {
      continue;
    }

    const textureX = Math.floor(tileX * texture.width) % texture.width;
    const textureY = Math.floor(tileY * texture.height) % texture.height;

    const baseColour: RGB = texture.colors[texture.bitmap[textureX][textureY]];
    const distColour: RGB = lightenDarkenRGB(baseColour, -(distance * 15 + ao));
    drawPixel({ x, y }, distColour, projection);
    ao = Math.max(ao - aoFactor, 0);
  }
};

interface Player {
  pos: Vec2;
  angle: number;
  keys: Set<PlayerActions>;
}

const checkMove = (move: Vec2) => {
  const { x, y } = vec2Apply(move, Math.floor);
  return level.data[y][x] === 0;
};

function App() {
  const player = useRef<Player>({
    pos: vec2(5, 5),
    angle: 220,
    keys: new Set<PlayerActions>(),
  });
  const fpsCounter = useRef<number>(0);
  const [fps, setFPS] = useState<number>(0);
  const width = Math.min(1020, Math.max(640, window.innerWidth * 0.9));
  const height = Math.floor(width / 1.333333);

  const engineDataRef = useRef<EngineData>({
    scale: 1,
    fov: 60,
    precision: 64,
  });

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

    const interval = setInterval(() => {
      setFPS(fpsCounter.current);
      fpsCounter.current = 0;
    }, 1000);

    level.textureFiles.forEach(({ src, id }) => loadTexture(src).then((texture) => (level.textures[id] = texture)));

    return () => clearInterval(interval);
  }, []);

  const getMove = (since: number, func: (a: Vec2, b: Vec2) => Vec2): Vec2 => {
    const { pos, angle } = player.current;
    const { x, y } = func(pos, move(angle, movement * since));

    if (checkMove({ x, y })) {
      return { x, y };
    } else {
      const { x, y } = func(pos, move(angle, movement * 0.75 * since));

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
    const { scale } = engineDataRef.current;
    context.scale(scale, scale);
    context.translate(0.5, 0.5);
    const width = context.canvas.width / scale;
    const height = context.canvas.height / scale;
    const imageData = context.createImageData(width, height);
    const buffer = imageData.data;

    engineDataRef.current.projection = { width, height, imageData, buffer };
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
          player.current.pos = getMove(since, addVec2);
          break;
        case "down":
          player.current.pos = getMove(since, subVec2);
          break;
        case "left":
          player.current.angle -= rotation * since;
          break;
        case "right":
          player.current.angle += rotation * since;
          break;
      }
    });

    const angleInc = engineData.fov / projection.width;
    const initalAngle = player.current.angle - engineData.fov / 2;
    const halfHeight = projection.height / 2;

    for (let i = 0; i < projection.width; i++) {
      const rayAngle = initalAngle + angleInc * i;
      const ray = vec2(pos.x, pos.y);
      const rayCos = Math.cos(degreeToRadians(rayAngle)) / engineData.precision;
      const raySin = Math.sin(degreeToRadians(rayAngle)) / engineData.precision;

      while (level.data[Math.floor(ray.y)][Math.floor(ray.x)] === 0) {
        ray.x += rayCos;
        ray.y += raySin;
      }
      const wallID = level.data[Math.floor(ray.y)][Math.floor(ray.x)];

      const distance = Math.sqrt(Math.pow(pos.x - ray.x, 2) + Math.pow(pos.y - ray.y, 2));
      const correctDistance = distance * Math.cos(degreeToRadians(rayAngle - angle));
      const wallHeight = Math.floor(projection.height / correctDistance);

      drawLine(vec2(i, 0), vec2(i, halfHeight - wallHeight), rgb(0, 255, 255), projection);
      drawFloor(i, wallHeight, player.current, rayAngle, projection);

      const texture = level.textures[wallID];
      const textureX = Math.floor(((ray.y + ray.x) * texture.width) % texture.width);
      drawTexture(i, wallHeight, textureX, texture, distance, projection);
    }

    if (engineData.scale != 1) {
      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = projection.width;
      renderCanvas.height = projection.height;
      const renderContext = renderCanvas.getContext("2d");

      renderContext?.putImageData(projection.imageData, 0, 0);
      context.drawImage(renderCanvas, 0, 0);
    } else {
      context.putImageData(projection.imageData, 0, 0);
    }

    fpsCounter.current = fpsCounter.current + 1;
  }, []);

  return (
    <div>
      <div>FPS: {fps}</div>
      <div>
        <Canvas animating={true} width={width} height={height} init={init} frame={frame} />
      </div>
    </div>
  );
}

export default App;
