'use client';

import { memo } from 'react';
import { Grid, Center, GizmoHelper, GizmoViewport, AccumulativeShadows, RandomizedLight, OrbitControls, Environment } from '@react-three/drei';
import { useControls } from 'leva';

export default function GridScene() {
  const { gridSize, ...gridConfig } = useControls({
    gridSize: [10.5, 10.5],
    cellSize: { value: 0.6, min: 0, max: 10, step: 0.1 },
    cellThickness: { value: 1, min: 0, max: 5, step: 0.1 },
    cellColor: '#6f6f6f',
    sectionSize: { value: 3.3, min: 0, max: 10, step: 0.1 },
    sectionThickness: { value: 1.5, min: 0, max: 5, step: 0.1 },
    sectionColor: '#9d4b4b',
    fadeDistance: { value: 25, min: 0, max: 100, step: 1 },
    fadeStrength: { value: 1, min: 0, max: 1, step: 0.1 },
    followCamera: false,
    infiniteGrid: true
  });

  return (
    <group position={[0, -0.5, 0]}>
      <Center top position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      </Center>
      
      <Shadows />
      <Grid position={[0, -0.01, 0]} args={gridSize} {...gridConfig} />
      
      <OrbitControls makeDefault />
      <Environment preset="city" />
      
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
      </GizmoHelper>
    </group>
  );
}

const Shadows = memo(() => (
  <AccumulativeShadows temporal frames={100} color="#9d4b4b" colorBlend={0.5} alphaTest={0.9} scale={20}>
    <RandomizedLight amount={8} radius={4} position={[5, 5, -10]} />
  </AccumulativeShadows>
));
