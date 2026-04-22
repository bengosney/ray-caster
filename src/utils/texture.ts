import { RGBA, rgba } from "./colour";
import { Data2D } from "../types/types";

export interface Texture {
  width: number;
  height: number;
  bitmap: Data2D;
  colors: RGBA[];
  src: string;
}

export interface Sprite extends Texture {
  scale: number;
  center: number;
}

export interface TextureFile {
  id: number;
  src: string;
}

export function loadTexture(imageSrc: string): Promise<Texture> {
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
        const colors: RGBA[] = [];
        const colorIdx: string[] = [];
        for (let i = 0; i < imageData.length; i += 4) {
          const [r, g, b, a] = [imageData[i], imageData[i + 1], imageData[i + 2], imageData[i + 3]];
          const color = rgba(r, g, b, a);
          const colourString = `${r}-${g}-${b}-${a}`;

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
          src: imageSrc,
        });
      }
    };
  });
}
