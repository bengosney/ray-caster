import Canvas from "./widgets/Canvas";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { rgb, lightenDarkenRGB, RGBToHex, RGB, RGBMatch } from "./utils/colour";
import brick from "./brick.png";

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

type Data2D = number[][];

interface Texture {
  width: number;
  height: number;
  bitmap: Data2D;
  colors: RGB[];
}

interface TextureFile {
  id: number;
  src: string;
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

interface Vec2 {
  x: number;
  y: number;
}
const vec2 = (x: number, y: number): Vec2 => ({ x, y });

const degreeToRadians = (degree: number): number => (degree * Math.PI) / 180;

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
) => {
  const yIncrement = (wallHeight * 2) / texture.height;
  let y = projection.height / 2 - wallHeight;

  for (let i = 0; i < texture.height; i++) {
    const baseColour = texture.colors[texture.bitmap[i][texturePositionX]];
    context.strokeStyle = RGBToHex(lightenDarkenRGB(baseColour, -(distance * 10)));
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y + (yIncrement + 0.5));
    context.stroke();
    y += yIncrement;
  }
};

interface Player {
  pos: Vec2;
  angle: number;
  keys: Set<PlayerActions>;
}

const move = (angle: number, amount: number): Vec2 => ({
  x: Math.cos(degreeToRadians(angle)) * amount,
  y: Math.sin(degreeToRadians(angle)) * amount,
});

const vec2Apply = (vec: Vec2, func: (x: number) => number): Vec2 => ({
  x: func(vec.x),
  y: func(vec.y),
});

const addVec2 = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

const subVec2 = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

const checkMove = (move: Vec2) => {
  const { x, y } = vec2Apply(move, Math.floor);
  return level.data[y][x] == 0;
};

const loadTexture = (imageSrc: string, textureID: number): void => {
  const img = document.createElement("img");
  const canvas = document.createElement("canvas");
  img.src = imageSrc;
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");

    if (context) {
      context.drawImage(img, 0, 0, img.width, img.height);
      const imageData = context.getImageData(0, 0, img.width, img.height).data;

      const pixels: number[] = [];
      const colours: RGB[] = [];
      const colourIdx: string[] = [];
      for (let i = 0; i < imageData.length; i += 4) {
        const colour = rgb(imageData[i], imageData[i + 1], imageData[i + 2]);
        const colourString = `${imageData[i]}-${imageData[i + 1]}-${imageData[i + 2]}`;

        if (!colours.reduce<boolean>((prev, cur) => prev || RGBMatch(cur, colour), false)) {
          colours.push(colour);
          colourIdx.push(colourString);
        }

        pixels.push(colourIdx.indexOf(colourString));
      }

      const bitmap: Data2D = [];
      while (pixels.length) {
        bitmap.push(pixels.splice(0, img.width));
      }

      const texture: Texture = {
        width: img.width,
        height: img.height,
        bitmap: bitmap,
        colors: colours,
      };

      level.textures[textureID] = texture;
    }
  };
};

function App() {
  const player = useRef<Player>({
    pos: vec2(5, 5),
    angle: 220,
    keys: new Set<PlayerActions>(),
  });
  const fpsCounter = useRef<number>(0);
  const [fps, setfps] = useState<number>(0);
  const width = 800;
  const height = 600;
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
      setfps(fpsCounter.current);
      fpsCounter.current = 0;
    }, 1000);

    level.textureFiles.forEach(({ src, id }) => loadTexture(src, id));

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Canvas?</h1>
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
                  {
                    const newPos = addVec2(pos, move(angle, movement * since));
                    if (checkMove(newPos)) {
                      player.current.pos = newPos;
                    }
                  }
                  break;
                case "down":
                  {
                    const newPos = subVec2(pos, move(angle, movement * since));
                    if (checkMove(newPos)) {
                      player.current.pos = newPos;
                    }
                  }
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

              while (level.data[Math.floor(ray.y)][Math.floor(ray.x)] == 0) {
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
