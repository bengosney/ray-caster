import Canvas from "./widgets/Canvas";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { rgb, lightenDarkenRGB, RGBToHex } from "./utils/colour";

const level = [
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
];

const precision = 64;

const keys = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
};

const movement = 0.1;
const rotation = 2.5;

interface Vec2 {
  x: number;
  y: number;
}
const vec2 = (x: number, y: number): Vec2 => ({ x, y });

const degreeToRadians = (degree: number): number => {
  let pi = Math.PI;
  return (degree * pi) / 180;
};

const drawLine = (p1: Vec2, p2: Vec2, colour: string, context: CanvasRenderingContext2D) => {
  context.strokeStyle = colour;
  context.beginPath();
  context.moveTo(p1.x, p1.y);
  context.lineTo(p2.x, p2.y);
  context.stroke();
};

const fov = 60;

interface Player {
  pos: Vec2;
  angle: number;
}

const move = (angle: number, amount: number): Vec2 => ({
  x: Math.cos(degreeToRadians(angle)) * amount,
  y: Math.sin(degreeToRadians(angle)) * amount,
});


const vec2Apply = (vec: Vec2, func: (x: number) => number): Vec2 => ({
  x: func(vec.x),
  y: func(vec.y),
})

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
  return level[x][y] == 0;
};

function App() {
  const player = useRef<Player>({
    pos: vec2(5, 5),
    angle: 220,
  });
  const fpsCounter = useRef<number>(0);
  const [fps, setfps] = useState<number>(0);

  useEffect(() => {
    document.addEventListener("keydown", (event) => {
      const { code } = event;
      switch (code) {
        case keys.up:
          player.current.pos = addVec2(player.current.pos, move(player.current.angle, movement));
          break;
        case keys.down:
          player.current.pos = subVec2(player.current.pos, move(player.current.angle, movement));
          break;
        case keys.left:
          player.current.angle -= rotation;
          break;
        case keys.right:
          player.current.angle += rotation;
          break;
      }
    });

    const interval = setInterval(() => {
      setfps(fpsCounter.current);
      fpsCounter.current = 0;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Canvas?</h1>
      <div>FPS: {fps}</div>
      <div>
        <Canvas
          clear={true}
          height={480}
          width={640}
          frame={(context, since) => {
            const angleInc = fov / context.canvas.width;
            const initalAngle = player.current.angle - fov / 2;
            const halfHeight = context.canvas.height / 2;
            const { pos, angle } = player.current;

            for (let i = 0; i < context.canvas.width; i++) {
              const rayAngle = initalAngle + angleInc * i;
              const ray = vec2(pos.x, pos.y);
              const rayCos = Math.cos(degreeToRadians(rayAngle)) / precision;
              const raySin = Math.sin(degreeToRadians(rayAngle)) / precision;

              while (level[Math.floor(ray.y)][Math.floor(ray.x)] == 0) {
                ray.x += rayCos;
                ray.y += raySin;
              }
              const distance = Math.sqrt(Math.pow(pos.x - ray.x, 2) + Math.pow(pos.y - ray.y, 2));
              const correctDistance = distance * Math.cos(degreeToRadians(rayAngle - angle));
              const wallHeight = Math.floor(context.canvas.height / correctDistance);

              drawLine(vec2(i, 0), vec2(i, halfHeight - wallHeight), "#00FFFF", context);
              drawLine(vec2(i, halfHeight + wallHeight), vec2(i, context.canvas.height), "#023020", context);
              const colour = RGBToHex(lightenDarkenRGB(rgb(255, 0, 0), -(distance * 10)));
              drawLine(vec2(i, halfHeight - wallHeight), vec2(i, halfHeight + wallHeight), colour, context);
            }
            fpsCounter.current = fpsCounter.current + 1;
          }}
        />
      </div>
    </div>
  );
}

export default App;
