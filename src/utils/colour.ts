export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b });

export const RGBToHex = ({ r, g, b }: RGB): string => "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);

export const lightenDarkenRGB = ({ r, g, b }: RGB, amt: number): RGB => ({
  r: Math.max(Math.min(r + amt, 255), 0),
  g: Math.max(Math.min(g + amt, 255), 0),
  b: Math.max(Math.min(b + amt, 255), 0),
});

export const RGBMatch = (a: RGB, b: RGB): boolean => a.r === b.r && a.g === b.g && a.b === b.b;
