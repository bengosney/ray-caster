import React, { useEffect, useRef, useState } from "react";
import useTimeSinceLast from "../hooks/useTimeSinceLast";

interface CanvasProps extends React.ComponentPropsWithoutRef<"canvas"> {
  frame: (context: CanvasRenderingContext2D, since: number) => void;
  init?: (context: CanvasRenderingContext2D) => void;
  initDependency?: any;
  clear?: string | true;
  animating?: boolean;
}

const Canvas = ({
  frame,
  init = undefined,
  initDependency = null,
  clear = undefined,
  animating = true,
  ...props
}: CanvasProps) => {
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
  }, [context, init, initDependency, context?.canvas.width, context?.canvas.height]);

  useEffect(() => {
    if (context && requestRef.current === 0) {
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
        } else {
          requestRef.current = 0;
        }
      };

      requestRef.current = requestAnimationFrame(() => draw());
      return () => {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = 0;
      };
    }
  }, [context, animating, clear, frame, since]);

  return <canvas ref={canvasRef} {...props}></canvas>;
};

export default Canvas;
