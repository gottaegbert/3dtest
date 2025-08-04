'use client';

import { Suspense, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

interface ThreeCanvasProps {
  children: ReactNode;
  camera?: {
    position?: [number, number, number];
    fov?: number;
  };
  style?: React.CSSProperties;
}

export default function ThreeCanvas({ 
  children, 
  camera = { position: [10, 12, 12], fov: 25 },
  style = { width: '100vw', height: '100vh' }
}: ThreeCanvasProps) {
  return (
    <div style={style}>
      <Suspense fallback={<div>Loading 3D scene...</div>}>
        <Canvas camera={camera}>
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
}
