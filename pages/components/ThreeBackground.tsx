/* eslint-disable @typescript-eslint/no-explicit-any */
// ThreeBackground.tsx - New file for Three.js animation
import { useEffect, useRef } from "react";

let _THREE: any = null;
const ThreeBackground: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const setup = async () => {
      try {
        const THREE = _THREE || (await import("three"));
        _THREE = THREE;

        const canvas = canvasRef.current!;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

        const setSize = () => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          renderer.setSize(w, h, false);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };

        // Add particles that respond to mouse position
        const starCount = 900;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 20;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ size: 0.02, transparent: true });
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        camera.position.z = 6;
        setSize();

        const onResize = () => setSize();
        window.addEventListener("resize", onResize);

        const animate = () => {
          if (disposed) return;
          points.rotation.y += 0.0008;
          points.rotation.x += 0.0004;
          renderer.render(scene, camera);
          rafRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
          disposed = true;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          window.removeEventListener("resize", onResize);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
        };
      } catch {
        return;
      }
    };

    const cleanupPromise = setup();
    return () => {
      if (typeof cleanupPromise === "function") (cleanupPromise as any)();
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 h-full w-full opacity-70" />;
};

export default ThreeBackground;
