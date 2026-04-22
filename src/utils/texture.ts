import { RGB, RGBA, rgb, rgba } from "./colour";
import { Data2D } from "../types/types";

export interface Texture<C extends RGB | RGBA = RGB> {
  width: number;
  height: number;
  bitmap: Data2D;
  colors: C[];
  src: string;
}

export interface Sprite extends Texture<RGBA> {
  scale: number;
  center: number;
}

export function loadTexture(imageSrc: string, alpha: true): Promise<Texture<RGBA>>;
export function loadTexture(imageSrc: string, alpha?: false): Promise<Texture<RGB>>;
export function loadTexture(imageSrc: string, alpha = false): Promise<Texture<RGB> | Texture<RGBA>> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    img.src = imageSrc;
    img.onerror = () => reject();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(0, 0, img.width, img.height).data;

        const pixels: number[] = [];
        const colors: (RGB | RGBA)[] = [];
        const colorIdx: string[] = [];
        for (let i = 0; i < imageData.length; i += 4) {
          const [r, g, b, a] = [imageData[i], imageData[i + 1], imageData[i + 2], imageData[i + 3]];
          const color = alpha ? rgba(r, g, b, a) : rgb(r, g, b);
          const colourString = alpha ? `${r}-${g}-${b}-${a}` : `${r}-${g}-${b}`;

          const existingIdx = colorIdx.indexOf(colourString);
          if (existingIdx === -1) {
            colorIdx.push(colourString);
            colors.push(color);
            pixels.push(colors.length - 1);
          } else {
            pixels.push(existingIdx);
          }
        }

        const bitmap = [];
        while (pixels.length) {
          bitmap.push(pixels.splice(0, img.width));
        }

        resolve({
          width: img.width,
          height: img.height,
          bitmap,
          colors,
        });
      }
    };
  });
}
