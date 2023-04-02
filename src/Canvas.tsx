import React, { HTMLProps, useEffect, useRef, useState } from 'react';
import './App.css';


const useTimeSinceLast = (inital: number = 0) => {
    const timeRef = useRef(inital);
    return () => {
        const ts = (new Date()).getTime();
        const passed = ts - timeRef.current;
        timeRef.current = ts;

        return passed;
    };
}

interface CanvasProps extends React.ComponentPropsWithoutRef<"canvas"> {
    frame: (context: CanvasRenderingContext2D, since: number) => void;
    clear?: string | true;
}

const Canvas = ({ frame, clear = undefined, ...props }: CanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const since = useTimeSinceLast();
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        if (canvasRef && canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            setContext(ctx);
        }
    }, [canvasRef]);

    useEffect(() => {
        if (context) {
            const draw = () => {
                if (clear) {
                    const {width, height} = context.canvas;
                    if (clear === true) {
                        context.clearRect(0, 0, width, height);
                    } else {
                        context.fillStyle = clear;
                	    context.fillRect(0, 0, width, height);
                    }
                }

                frame(context, since());
                requestRef.current = requestAnimationFrame(() => draw());
            }

            requestRef.current = requestAnimationFrame(() => draw());
            return () => cancelAnimationFrame(requestRef.current);
        }
    }, [context])

    return <canvas ref={canvasRef} {...props} ></canvas>
}

export default Canvas;