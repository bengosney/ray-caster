export const ASPECT_4_3 = 1.333333;
export const ASPECT_16_9 = 1.777777;
export const ASPECT_16_10 = 1.6;

interface WidthHeight {
  width: number;
  height: number;
}

const useMaxSize = (aspect: number): WidthHeight => {
  const { innerWidth, innerHeight } = window;

  let width = innerWidth;
  let height;

  do {
    width = width - innerWidth * 0.1;
    height = Math.floor(width / aspect);
  } while (height > innerHeight * 0.8);

  return { width, height };
};

export default useMaxSize;
