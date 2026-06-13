import { useEffect, useRef } from "react";
import { startHandTracking } from "./handTracking";

export function XRSession() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = startHandTracking(canvasRef.current);
    return cleanup;
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh", display: "block" }} />;
}
