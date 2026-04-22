export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const rgba = (r: number, g: number, b: number, a: number): RGBA => ({ r, g, b, a });
export const rgb = (r: number, g: number, b: number): RGBA => rgba(r, g, b, 255);

export const RGBToHex = ({ r, g, b }: RGBA): string =>
  "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);

export const lightenDarkenRGB = ({ r, g, b, ...o }: RGBA, amt: number): RGBA => ({
  r: Math.max(Math.min(r + amt, 255), 0),
  g: Math.max(Math.min(g + amt, 255), 0),
  b: Math.max(Math.min(b + amt, 255), 0),
  ...o,
});
