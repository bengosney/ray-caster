import Canvas from "./widgets/Canvas";
import "./App.css";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { rgba, rgb } from "./utils/colour";
import { ArrowBigDown, ArrowBigLeft, ArrowBigRight, ArrowBigUp } from "lucide-react";
import {
  Vec2,
  addVec2,
  angleDegVec2,
  cosFromDegree,
  sinFromDegree,
  distVec2,
  move,
  vec2,
  vec2Apply,
} from "./utils/math";
import { Texture, Sprite, loadTexture } from "./utils/texture";
import { ProjectionData, drawLine, drawTexture, drawFloor, drawSprite } from "./utils/draw";

import { makeNoise2D } from "open-simplex-noise";

import brick from "./brick.png";
import floor from "./floor.png";
import dot from "./dot.png";
import useMaxSize from "./hooks/useMaxSize";

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
  textures: Texture[];
  sprites: Sprite[];
  entities: Entity[];
}

const noise2D = makeNoise2D(0);
const levelData = new Map<number, number>();
const getLevelDataUncached = ({ x, y }: Vec2): number => (noise2D(x, y) > 0.5 ? 1 : 0);
const getLevelData = ({ x, y }: Vec2): number => {
  const key = x * 65536 + y;
  let v = levelData.get(key);
  if (typeof v === "undefined") {
    v = getLevelDataUncached({ x, y });
    levelData.set(key, v);
  }
  return v;
};

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
      scale: 4,
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
  const [fps, setFps] = useState<number>(0);
  const resolutions = [
    { label: "CGA (320×200)", w: 320, h: 200 },
    { label: "EGA (640×350)", w: 640, h: 350 },
    { label: "VGA (640×480)", w: 640, h: 480 },
    { label: "SVGA (800×600)", w: 800, h: 600 },
    { label: "XGA (1024×768)", w: 1024, h: 768 },
    { label: "1080p (1920×1080)", w: 1920, h: 1080 },
    { label: "4K (3840×2160)", w: 3840, h: 2160 },
  ];
  const [activeKeys, setActiveKeys] = useState<Set<PlayerActions>>(new Set());
  const [resolutionIndex, setResolutionIndex] = useState<number>(0);
  const renderWidth = resolutions[resolutionIndex].w;
  const renderHeight = resolutions[resolutionIndex].h;
  const { width, height } = useMaxSize(renderWidth / renderHeight);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(fpsCounter.current);
      fpsCounter.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const engineDataRef = useRef<EngineData>({
    fov: 60,
    precision: 64,
  });
  const renderCanvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));

  const pressKey = useCallback((action: PlayerActions) => {
    player.current.keys.add(action);
    setActiveKeys((prev) => new Set(prev).add(action));
  }, []);

  const releaseKey = useCallback((action: PlayerActions) => {
    player.current.keys.delete(action);
    setActiveKeys((prev) => {
      const s = new Set(prev);
      s.delete(action);
      return s;
    });
  }, []);

  const Control = useCallback(
    ({ action, children }: { action: PlayerActions; children: ReactNode }) => (
      <button
        className={activeKeys.has(action) ? "active" : undefined}
        onTouchStart={() => pressKey(action)}
        onMouseDown={() => pressKey(action)}
        onTouchEnd={() => releaseKey(action)}
        onTouchCancel={() => releaseKey(action)}
        onMouseUp={() => releaseKey(action)}
        onMouseLeave={() => releaseKey(action)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </button>
    ),
    [activeKeys, pressKey, releaseKey],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { code } = event;
      if (code in actions) {
        pressKey(actions[code]);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const { code } = event;
      releaseKey(actions[code]);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    level.textures.forEach((t, i) => loadTexture(t.src).then((loaded) => (level.textures[i] = loaded)));
    level.sprites.forEach((s, i) => loadTexture(s.src).then((loaded) => (level.sprites[i] = { ...s, ...loaded })));

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressKey, releaseKey]);

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

  const init = useCallback(
    (context: CanvasRenderingContext2D) => {
      context.scale(1, 1);
      context.translate(0.5, 0.5);
      const imageData = context.createImageData(renderWidth, renderHeight);
      const buffer = imageData.data;
      const halfHeight = renderHeight / 2;

      engineDataRef.current.projection = { width: renderWidth, height: renderHeight, halfHeight, imageData, buffer };
    },
    [renderWidth, renderHeight],
  );

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

    const getWallID = (ray: Vec2, rayCos: number, raySin: number): number => {
      const pos: Vec2 = vec2(0, 0);
      for (let i = 0; i < 1250; i++) {
        pos.x = Math.floor(ray.x);
        pos.y = Math.floor(ray.y);
        const wallID = level.data(pos);
        if (wallID !== 0) {
          return wallID;
        }

        ray.x += rayCos;
        ray.y += raySin;
      }
      return 0;
    };

    for (let i = 0; i < projection.width; i++) {
      const rayAngle = initalAngle + angleInc * i;
      const ray = vec2(pos.x, pos.y);
      const rayCos = cosFromDegree(rayAngle) / engineData.precision;
      const raySin = sinFromDegree(rayAngle) / engineData.precision;

      const wallID = getWallID(ray, rayCos, raySin);

      const dx = pos.x - ray.x;
      const dy = pos.y - ray.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const correctDistance = distance * cosFromDegree(rayAngle - angle);
      depthMap[i] = correctDistance;
      const wallHeight = Math.floor(projection.height / correctDistance);

      drawLine(vec2(i, 0), vec2(i, halfHeight - wallHeight), rgba(0, 200, 200, 255), projection);

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
      const correctDistance = distance * cosFromDegree(diff);
      const height = Math.floor(projection.height / correctDistance);
      const x = (halfFOV + diff) * pixelPerDeg;

      drawSprite(level.sprites[entity.spriteID], vec2(x, height), correctDistance, depthMap, projection);
    });

    const renderCanvas = renderCanvasRef.current;
    if (renderCanvas.width !== projection.width) renderCanvas.width = projection.width;
    if (renderCanvas.height !== projection.height) renderCanvas.height = projection.height;
    const renderContext = renderCanvas.getContext("2d");

    renderContext?.putImageData(projection.imageData, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(renderCanvas, 0, 0, context.canvas.width, context.canvas.height);

    fpsCounter.current = fpsCounter.current + 1;
  }, []);

  return (
    <div>
      <div className="canvas-container">
        <Canvas animating={true} width={width} height={height} init={init} frame={frame} />
        <div className="fps-counter">{fps} FPS</div>
      </div>
      <div className="controles">
        <div className="buttons">
          <div></div>
          <div>
            <Control action="up">
              <ArrowBigUp />
            </Control>
          </div>
          <div></div>
          <div>
            <Control action="left">
              <ArrowBigLeft />
            </Control>
          </div>
          <div>
            <Control action="down">
              <ArrowBigDown />
            </Control>
          </div>
          <div>
            <Control action="right">
              <ArrowBigRight />
            </Control>
          </div>
        </div>
        <div className="resolution-controls">
          <label>Resolution:</label>
          <select value={resolutionIndex} onChange={(e) => setResolutionIndex(parseInt(e.target.value))}>
            {resolutions.map((res, i) => (
              <option key={res.label} value={i}>
                {res.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default App;
