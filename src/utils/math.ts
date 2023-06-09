export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

export const degreeToRadians = (degree: number): number => (degree * Math.PI) / 180;

export const move = (angle: number, amount: number): Vec2 => ({
  x: Math.cos(degreeToRadians(angle)) * amount,
  y: Math.sin(degreeToRadians(angle)) * amount,
});

export const vec2Apply = (vec: Vec2, func: (x: number) => number): Vec2 => ({
  x: func(vec.x),
  y: func(vec.y),
});

export const addVec2 = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export const subVec2 = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

export const distVec2 = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const angleRadVec2 = (a: Vec2, b: Vec2): number => Math.atan2(b.y - a.y, b.x - a.x);

export const angleDegVec2 = (a: Vec2, b: Vec2): number => (angleRadVec2(a, b) * 180) / Math.PI;
