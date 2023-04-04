import Canvas from "./widgets/Canvas";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { rgb, lightenDarkenRGB, RGBToHex, RGB, RGBMatch } from "./utils/colour";
import brick from "./brick.png";
import { Vec2, addVec2, degreeToRadians, move, subVec2, vec2, vec2Apply } from "./utils/math";
import { Texture, TextureFile, loadTexture } from "./utils/texture";
import { Data2D } from "./types/types";

interface ProjectionData {
  width: number;
  height: number;
}
interface EngineData {
  fov: number;
  precision: number;
  scale: number;
  projection: ProjectionData;
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
  textureFiles: [{ src: brick, id: 0 }],
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
const rotation = 0.15;

const drawLine = (p1: Vec2, p2: Vec2, colour: string, context: CanvasRenderingContext2D) => {
  context.strokeStyle = colour;
  context.beginPath();
  context.moveTo(p1.x, p1.y);
  context.lineTo(p2.x, p2.y);
  context.stroke();
};

const drawTexture = (
  x: number,
  wallHeight: number,
  texturePositionX: number,
  texture: Texture,
  distance: number,
  context: CanvasRenderingContext2D,
  projection: ProjectionData,
): void => {
  const yIncrement: number = (wallHeight * 2) / texture.height;
  let y: number = projection.height / 2 - wallHeight;
  const pixelGroups: { [key: string]: number[] } = {};

  for (let i = 0; i < texture.height; i++) {
    const baseColour: RGB = texture.colors[texture.bitmap[i][texturePositionX]];
    const hexColour: string = RGBToHex(lightenDarkenRGB(baseColour, -(distance * 10)));
    if (!pixelGroups[hexColour]) {
      pixelGroups[hexColour] = [];
    }
    pixelGroups[hexColour].push(y);
    y += yIncrement;
  }

  Object.keys(pixelGroups).forEach((colour) => {
    context.strokeStyle = colour;
    context.beginPath();
    pixelGroups[colour].forEach((y) => {
      context.moveTo(x, y);
      context.lineTo(x, y + (yIncrement + 0.5));
    });
    context.stroke();
  });
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
  const width = 640;
  const height = 480;
  const engineDataRef = useRef<EngineData>({
    scale: 1,
    fov: 60,
    precision: 64,
    projection: {
      height: width,
      width: height,
    },
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

    level.textureFiles.forEach(({ src, id }) => loadTexture(src, id).then((texture) => (level.textures[id] = texture)));

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

  return (
    <div>
      <div>FPS: {fps}</div>
      <div>
        <Canvas
          animating={true}
          width={width}
          height={height}
          init={(context) => {
            const { scale } = engineDataRef.current;
            context.scale(scale, scale);
            context.translate(0.5, 0.5);
            engineDataRef.current.projection.width = context.canvas.width / scale;
            engineDataRef.current.projection.height = context.canvas.height / scale;
          }}
          frame={(context, since) => {
            const { pos, angle } = player.current;
            const engineData = engineDataRef.current;
            const { projection } = engineData;

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
              const wallID = level.data[Math.floor(ray.y)][Math.floor(ray.x)] - 1;

              const distance = Math.sqrt(Math.pow(pos.x - ray.x, 2) + Math.pow(pos.y - ray.y, 2));
              const correctDistance = distance * Math.cos(degreeToRadians(rayAngle - angle));
              const wallHeight = Math.floor(projection.height / correctDistance);

              drawLine(vec2(i, 0), vec2(i, halfHeight - wallHeight), "#00FFFF", context);
              drawLine(vec2(i, halfHeight + wallHeight), vec2(i, projection.height), "#023020", context);

              const texture = level.textures[wallID];
              const textureX = Math.floor(((ray.y + ray.x) * texture.width) % texture.width);
              drawTexture(i, wallHeight, textureX, texture, distance, context, projection);
            }

            fpsCounter.current = fpsCounter.current + 1;
          }}
        />
      </div>
    </div>
  );
}

export default App;
