export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

const radiansCache = new Float64Array(3600);
const cosCache = new Float64Array(3600);
const sinCache = new Float64Array(3600);
for (let i = 0; i < 3600; i++) {
  const radian = (i / 10) * (Math.PI / 180);
  radiansCache[i] = radian;
  cosCache[i] = Math.cos(radian);
  sinCache[i] = Math.sin(radian);
}

const normaliseIndex = (degree: number): number => {
  const index = Math.round(degree * 10) % 3600;
  return index >= 0 ? index : index + 3600;
};

export const degreeToRadians = (degree: number): number => {
  const cached = radiansCache[normaliseIndex(degree)];
  return cached !== undefined ? cached : (degree * Math.PI) / 180;
};

export const cosFromDegree = (degree: number): number => {
  const cached = cosCache[normaliseIndex(degree)];
  return cached !== undefined ? cached : Math.cos(degreeToRadians(degree));
};

export const sinFromDegree = (degree: number): number => {
  const cached = sinCache[normaliseIndex(degree)];
  return cached !== undefined ? cached : Math.sin(degreeToRadians(degree));
};

export const move = (angle: number, amount: number): Vec2 => ({
  x: cosFromDegree(angle) * amount,
  y: sinFromDegree(angle) * amount,
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
