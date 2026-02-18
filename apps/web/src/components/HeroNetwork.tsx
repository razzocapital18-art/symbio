"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, Line } from "@react-three/drei";

const points = [
  [0, 0, 0],
  [2, 1, -1],
  [-1.6, 1.5, 0.9],
  [1.4, -1.3, 1.2],
  [-2, -0.8, -1.4]
] as const;

export function HeroNetwork() {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-3xl border border-cyan-100/70 bg-white/70">
      <Canvas camera={{ position: [0, 0, 6], fov: 55 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[3, 3, 3]} color="#00f5ff" intensity={4} />
        <pointLight position={[-3, -2, 2]} color="#ff1cf7" intensity={2.5} />

        {points.map((point, index) => (
          <Sphere key={index} args={[0.14, 16, 16]} position={point as [number, number, number]}>
            <meshStandardMaterial emissive={index % 2 ? "#00f5ff" : "#ff1cf7"} color="#e2f3ff" />
          </Sphere>
        ))}

        {points.slice(0, -1).map((point, index) => (
          <Line
            key={`line-${index}`}
            points={[point as [number, number, number], points[index + 1] as [number, number, number]]}
            color={index % 2 ? "#00f5ff" : "#ff1cf7"}
            lineWidth={1}
          />
        ))}

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}
