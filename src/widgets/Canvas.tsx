import React, { useEffect, useRef, useState } from "react";
import useTimeSinceLast from "../hooks/useTimeSinceLast";

interface CanvasProps extends React.ComponentPropsWithoutRef<"canvas"> {
  frame: (context: CanvasRenderingContext2D, since: number) => void;
  init?: (context: CanvasRenderingContext2D) => void;
  clear?: string | true;
  animating?: boolean;
}

const Canvas = ({ frame, init = undefined, clear = undefined, animating = true, ...props }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const since = useTimeSinceLast();
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (canvasRef && canvasRef.current) {
      setContext(canvasRef.current.getContext("2d"));
    }
  }, [canvasRef]);

  useEffect(() => {
    if (context && init) {
      init(context);
    }
  }, [context]);

  useEffect(() => {
    if (context) {
      const draw = () => {
        if (clear) {
          const { width, height } = context.canvas;
          if (clear === true) {
            context.clearRect(0, 0, width, height);
          } else {
            context.fillStyle = clear;
            context.fillRect(0, 0, width, height);
          }
        }

        frame(context, since());
        if (animating) {
          requestRef.current = requestAnimationFrame(() => draw());
        }
      };

      requestRef.current = requestAnimationFrame(() => draw());
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [context, animating, clear]);

  return <canvas ref={canvasRef} {...props}></canvas>;
};

export default Canvas;
