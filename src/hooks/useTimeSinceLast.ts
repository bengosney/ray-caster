import { useRef } from "react";

type SinceFunc = () => number;

export const useTimeSinceLast = (inital: number = 0): SinceFunc => {
  const timeRef = useRef(inital);
  return () => {
    const ts = new Date().getTime();
    const passed = ts - timeRef.current;
    timeRef.current = ts;

    return passed;
  };
};

export default useTimeSinceLast;
