import { resolve } from "path";
import { RGB, RGBMatch, rgb } from "./colour";
import { Data2D } from "../types/types";

export interface Texture {
  width: number;
  height: number;
  bitmap: Data2D;
  colors: RGB[];
}

export interface TextureFile {
  id: number;
  src: string;
}

export const loadTexture = (imageSrc: string, textureID: number): Promise<Texture> => {
  return new Promise<Texture>((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(0, 0, img.width, img.height).data;

        const pixels: number[] = [];
        const colours: RGB[] = [];
        const colourIdx: string[] = [];
        for (let i = 0; i < imageData.length; i += 4) {
          const colour = rgb(imageData[i], imageData[i + 1], imageData[i + 2]);
          const colourString = `${imageData[i]}-${imageData[i + 1]}-${imageData[i + 2]}`;

          if (!colours.reduce<boolean>((prev, cur) => prev || RGBMatch(cur, colour), false)) {
            colours.push(colour);
            colourIdx.push(colourString);
          }

          pixels.push(colourIdx.indexOf(colourString));
        }

        const bitmap = [];
        while (pixels.length) {
          bitmap.push(pixels.splice(0, img.width));
        }

        const texture = {
          width: img.width,
          height: img.height,
          bitmap: bitmap,
          colors: colours,
        };

        resolve(texture);
      }
    };
  });
};
