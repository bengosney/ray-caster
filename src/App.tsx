import Canvas from "./widgets/Canvas";
import "./App.css";
import { useRef, useState } from "react";

const level = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const precision = 64;

interface Vec2 {
  x: number;
  y: number;
}
const vec2 = (x: number, y: number): Vec2 => ({ x, y });

interface Vec3 {
  x: number;
  y: number;
  z: number;
}
const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

const degreeToRadians = (degree: number): number => {
  let pi = Math.PI;
  return (degree * pi) / 180;
};

const drawLine = (
  p1: Vec2,
  p2: Vec2,
  colour: string,
  context: CanvasRenderingContext2D
) => {
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

function App() {
  const player = useRef<Player>({
    pos: vec2(5, 5),
    angle: 220,
  });

  return (
    <div>
      <h1>Canvas?</h1>
      <input type="number" placeholder="220" onChange={(e) => player.current.angle = parseInt(e.target.value)} />
      <div>
        <Canvas
          clear={true}
          height={480}
          width={640}
          frame={(context, since) => {
            const angleInc = fov / context.canvas.width;
            const initalAngle = player.current.angle - fov / 2;

            const halfHeight = context.canvas.height / 2;

            for (let i = 0; i < context.canvas.width; i++) {
              const rayAngle = initalAngle + angleInc * i;
              const ray = vec2(player.current.pos.x, player.current.pos.y);
              const rayCos = Math.cos(degreeToRadians(rayAngle)) / precision;
              const raySin = Math.sin(degreeToRadians(rayAngle)) / precision;

              while (level[Math.floor(ray.y)][Math.floor(ray.x)] == 0) {
                ray.x += rayCos;
                ray.y += raySin;
              }
              const distance = Math.sqrt(Math.pow(player.current.pos.x - ray.x, 2) + Math.pow(player.current.pos.y - ray.y, 2));
              const wallHeight = Math.floor(context.canvas.height / distance);

              drawLine(vec2(i, 0), vec2(i, halfHeight - wallHeight), "cyan", context);
              drawLine(vec2(i, halfHeight - wallHeight), vec2(i, halfHeight + wallHeight), "red", context);
              drawLine(vec2(i, halfHeight + wallHeight), vec2(i, context.canvas.height), "green", context);
            }
          }}
        />
      </div>
    </div>
  );
}

export default App;
