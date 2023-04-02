import { useRef } from "react";

export const useTimeSinceLast = (inital: number = 0) => {
    const timeRef = useRef(inital);
    return () => {
        const ts = (new Date()).getTime();
        const passed = ts - timeRef.current;
        timeRef.current = ts;

        return passed;
    };
}

export default useTimeSinceLast;