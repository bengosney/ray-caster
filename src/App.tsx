import Canvas from "./widgets/Canvas";
import "./App.css";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import { rgb, rgba, RGB } from "./utils/colour";
import { Vec2, addVec2, angleDegVec2, degreeToRadians, distVec2, move, vec2, vec2Apply } from "./utils/math";
import { Texture, loadTexture, Sprite } from "./utils/texture";
import { ProjectionData, drawLine, drawTexture, drawFloor, drawSprite } from "./utils/draw";

import { makeNoise2D } from "open-simplex-noise";

import brick from "./brick.png";
import floor from "./floor.png";
import dot from "./dot.png";
import useMaxSize, { ASPECT_4_3 } from "./hooks/useMaxSize";

interface EngineData {
  fov: number;
  precision: number;
  projection?: ProjectionData;
}

interface Entity {
  spriteID: number;
  position: Vec2;
}

interface Level {
  data: (pos: Vec2) => number;
  textures: Texture<RGB>[];
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
      src: floor,
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
      src: brick,
    },
  ],
  sprites: [
    {
      scale: 30,
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
      colors: [rgba(0, 0, 0, 0), rgba(200, 0, 0, 255)],
      src: dot,
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

    level.textures.forEach((t, i) => loadTexture(t.src).then((loaded) => (level.textures[i] = loaded)));
    level.sprites.forEach((s, i) => loadTexture(s.src, true).then((loaded) => (level.sprites[i] = { ...s, ...loaded })));
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

    const depthMap: number[] = [];

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

      drawFloor(i, wallHeight, player.current, rayAngle, level.textures[0], projection);
    }

    const wrappedAngle = angle % 360;
    const pixelPerDeg = projection.width / engineData.fov;
    const halfFOV = engineData.fov / 2;
    level.entities.forEach((entity) => {
      const angleTo = angleDegVec2(pos, entity.position);
      const diff = ((angleTo - wrappedAngle + 540) % 360) - 180;
      const distance = distVec2(entity.position, pos);
      const correctDistance = distance * Math.cos(degreeToRadians(diff));
      const height = Math.floor(projection.height / correctDistance);
      const x = (halfFOV + diff) * pixelPerDeg;

      drawSprite(level.sprites[entity.spriteID], vec2(x, height), correctDistance, depthMap, projection);
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
        <Canvas animating={true} width={width} height={height} init={init} frame={frame} />
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
