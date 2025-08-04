import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Grid, Center, GizmoHelper, GizmoViewport, AccumulativeShadows, RandomizedLight, OrbitControls, Environment, Edges } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'

// 相机控制组件
function CameraController({ viewMode, cameraDistance, animationDuration = 1.2, enableAnimation = true }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef()

  // 动画状态
  const [isAnimating, setIsAnimating] = useState(false)
  const [startPosition, setStartPosition] = useState(new THREE.Vector3())
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3())
  const [animationProgress, setAnimationProgress] = useState(0)
  const [currentViewMode, setCurrentViewMode] = useState(viewMode)

  // 计算目标相机位置
  const getTargetPosition = (mode, distance) => {
    if (mode === '2D-Right') {
      return new THREE.Vector3(0, 0, -distance)
    } else if (mode === '45-Degree') {
      return new THREE.Vector3(distance * 0.25, distance * 0.25, -distance * 0.5)
    }
    return new THREE.Vector3(0, 0, -distance)
  }

  // 初始化正交相机
  useEffect(() => {
    if (!camera || !controlsRef.current) return

    // 设置正交相机
    if (camera.type !== 'OrthographicCamera') {
      const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight
      const frustumSize = 10
      const newCamera = new THREE.OrthographicCamera((-frustumSize * aspect) / 2, (frustumSize * aspect) / 2, frustumSize / 2, -frustumSize / 2, 0.1, 1000)

      // 替换相机
      gl.xr.setCamera(newCamera)
      camera.copy(newCamera)
      camera.type = 'OrthographicCamera'
    }
  }, [camera, gl])

  // 处理视角模式或距离变化
  useEffect(() => {
    if (!camera || !controlsRef.current) return

    const newTargetPosition = getTargetPosition(viewMode, cameraDistance)

    // 如果视角模式改变，启动动画
    if (viewMode !== currentViewMode && enableAnimation) {
      setStartPosition(camera.position.clone())
      setTargetPosition(newTargetPosition)
      setAnimationProgress(0)
      setIsAnimating(true)
      setCurrentViewMode(viewMode)
    } else {
      // 如果动画被禁用或只是距离改变，直接设置位置
      camera.position.copy(newTargetPosition)
      camera.lookAt(0, 0, 0)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
      setCurrentViewMode(viewMode)
    }
  }, [viewMode, cameraDistance, camera, currentViewMode])

  // 动画帧更新
  useFrame((state, delta) => {
    if (!isAnimating || !camera || !controlsRef.current) return

    // 使用传入的动画持续时间
    const progressIncrement = delta / animationDuration

    setAnimationProgress((prev) => {
      const newProgress = Math.min(prev + progressIncrement, 1)

      // 使用缓动函数（easeInOutCubic）
      const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      const easedProgress = easeInOutCubic(newProgress)

      // 插值计算当前位置
      const currentPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easedProgress)

      // 更新相机位置
      camera.position.copy(currentPosition)
      camera.lookAt(0, 0, 0)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()

      // 动画完成
      if (newProgress >= 1) {
        setIsAnimating(false)
        return 0
      }

      return newProgress
    })
  })

  return <OrbitControls ref={controlsRef} makeDefault enabled={!isAnimating} />
}

// 创建带坡口的立方体组件
function BeveledBox({
  size = 2,
  bevelWidth = 0.5,
  bevelHeight = 0.5,
  bevelAngle = Math.PI / 4,
  enableBevel = true,
  showEdges = true,
  edgeColor = '#000000',
  edgeWidth = 2,
  showCutFaces = true,
  cutFaceColor = '#FF5900',
  cutFaceOpacity = 0.6
}) {
  const geometry = useMemo(() => {
    if (!enableBevel) {
      return new THREE.BoxGeometry(size, size, size)
    }

    // 创建自定义几何体
    const shape = new THREE.Shape()
    const halfSize = size / 2

    // 定义立方体的一个面，带有坡口切割
    shape.moveTo(-halfSize, -halfSize)
    shape.lineTo(halfSize, -halfSize)
    shape.lineTo(halfSize, halfSize - bevelHeight)

    // 创建坡口切割线
    const bevelEndX = halfSize - bevelWidth * Math.cos(bevelAngle)
    const bevelEndY = halfSize - bevelWidth * Math.sin(bevelAngle)
    shape.lineTo(bevelEndX, bevelEndY)
    shape.lineTo(halfSize - bevelWidth, halfSize)

    shape.lineTo(-halfSize, halfSize)
    shape.closePath()

    // 挤出几何体
    const extrudeSettings = {
      depth: size,
      bevelEnabled: false
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

    // 调整位置使其居中
    geometry.translate(0, 0, -size / 2)

    return geometry
  }, [size, bevelWidth, bevelHeight, bevelAngle, enableBevel])

  // 创建边框线几何体
  const wireframeGeometry = useMemo(() => {
    if (!enableBevel) {
      return new THREE.BoxGeometry(size, size, size)
    }
    return geometry
  }, [geometry, size, enableBevel])

  const halfSize = size / 2

  return (
    <group>
      {/* 主立方体 */}
      <mesh>
        <primitive object={geometry} />
        <meshStandardMaterial color="#555555" />
        {/* 使用Edges组件添加边框 */}
        {showEdges && <Edges color={edgeColor} lineWidth={edgeWidth} />}
      </mesh>

      {/* 被切割的面 - 只在启用坡口时显示 */}
      {enableBevel && showCutFaces && (
        <group>
          {/* 垂直切割面 - 显示在被切掉的垂直内表面 */}
          <group>
            {(() => {
              // 垂直切割面的位置和尺寸
              const faceX = halfSize - bevelWidth - 0.001 // 稍微向内偏移避免z-fighting
              const faceY = halfSize - bevelHeight / 2
              const faceHeight = bevelHeight

              return (
                <>
                  {/* 半透明橙色面 */}
                  {/* <mesh
                    position={[faceX+0.02, faceY+0.02, 0]}
                    rotation={[bevelAngle, Math.PI/2-bevelAngle, 0]} // 面向+X方向（向外）
                  >
                    <planeGeometry args={[size, faceHeight]} />
                    <meshStandardMaterial color={cutFaceColor} transparent opacity={cutFaceOpacity} side={THREE.DoubleSide} />
                  </mesh> */}

                  {/* 轮廓线 */}
                  {/* <mesh position={[faceX - 0.001, faceY, 0]} rotation={[bevelAngle, -Math.PI / 2, 0]}>
                    <planeGeometry args={[size, faceHeight]} />
                    <meshBasicMaterial color={cutFaceColor} wireframe={true} transparent opacity={0.8} />
                  </mesh> */}
                </>
              )
            })()}
          </group>

          {/* 坡口斜面 - 连接两个切割面的内斜面 */}
          <group>
            {(() => {
              // 计算坡口斜面的几何参数
              const bevelLength = Math.sqrt(bevelWidth * bevelWidth + bevelHeight * bevelHeight)

              // 斜面中心点的计算
              const centerX = halfSize - bevelWidth / 2
              const centerY = halfSize - bevelHeight / 2

              // 根据bevelAngle调整斜面的方向
              // bevelAngle是从水平线逆时针测量的角度
              const rotationZ = bevelAngle + Math.PI / 2 // 调整为正确的斜面角度

              return (
                <>
                  {/* 半透明橙色斜面 */}
                  <mesh position={[centerX - 0.001, centerY - 0.001, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
                    <planeGeometry args={[bevelLength, size]} />
                    <meshStandardMaterial color={cutFaceColor} transparent opacity={cutFaceOpacity * 0.8} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh position={[centerX+0.1 , centerY+0.1 , 0]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
                    <planeGeometry args={[bevelLength, size]} />
                    <meshStandardMaterial color={0x0089ba} transparent opacity={cutFaceOpacity * 0.8} side={THREE.DoubleSide} />
                  </mesh>

                  {/* 轮廓线 */}
                  {/* <mesh position={[centerX, centerY, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
                    <planeGeometry args={[bevelLength, size]} />
                    <meshBasicMaterial color={cutFaceColor} wireframe={true} transparent opacity={0.6} />
                  </mesh> */}
                </>
              )
            })()}
          </group>
        </group>
      )}
    </group>
  )
}

export default function App() {
  const { gridSize, ...gridConfig } = useControls('Grid', {
    gridSize: [10, 10],
    cellSize: { value: 0.1, min: 0, max: 10, step: 0.05 },
    cellThickness: { value: 1, min: 0, max: 5, step: 0.1 },
    cellColor: '#efefef',
    sectionSize: { value: 1, min: 0, max: 10, step: 0.1 },
    sectionThickness: { value: 1.5, min: 0, max: 5, step: 0.1 },
    sectionColor: '#f6f6f',
    fadeDistance: { value: 25, min: 0, max: 100, step: 1 },
    fadeStrength: { value: 1, min: 0, max: 1, step: 0.1 },
    followCamera: false,
    infiniteGrid: true
  })

  const bevelControls = useControls('坡口设置', {
    enableBevel: true,
    bevelWidth: { value: 0.5, min: 0, max: 1.5, step: 0.1 },
    bevelHeight: { value: 0.5, min: 0, max: 1.5, step: 0.1 },
    bevelAngle: { value: Math.PI / 4, min: 0, max: Math.PI / 2, step: 0.1 },
    boxSize: { value: 2, min: 0.5, max: 4, step: 0.1 },
    showEdges: true,
    edgeColor: '#000000',
    edgeWidth: { value: 2, min: 1, max: 5, step: 1 },
    showCutFaces: true,
    cutFaceColor: '#FF5900',
    cutFaceOpacity: { value: 0.8, min: 0.1, max: 1, step: 0.1 }
  })

  const cameraControls = useControls('相机设置', {
    viewMode: {
      value: '45-Degree',
      options: ['2D-Right', '45-Degree']
    },
    cameraDistance: { value: 15, min: 5, max: 30, step: 1 },
    animationDuration: { value: 1.2, min: 0.3, max: 3, step: 0.1 },
    enableAnimation: true
  })

  const backgroundControls = useControls('背景设置', {
    backgroundColor: '#f0f0f0',
    groundColor: '#e0e0e0',
    showGround: true,
    groundSize: { value: 20, min: 5, max: 50, step: 1 }
  })
  return (
    <Canvas
      orthographic
      camera={{
        position: [15, 15, 15],
        zoom: 200,
        near: 0.1,
        far: 1000
      }}
      style={{ backgroundColor: backgroundControls.backgroundColor }}>
      <color attach="background" args={[backgroundControls.backgroundColor]} />

      <group position={[0, -0.5, 0]}>
        <Center top position={[0, 0, 0]}>
          <BeveledBox
            size={bevelControls.boxSize}
            bevelWidth={bevelControls.bevelWidth}
            bevelHeight={bevelControls.bevelHeight}
            bevelAngle={bevelControls.bevelAngle}
            enableBevel={bevelControls.enableBevel}
            showEdges={bevelControls.showEdges}
            edgeColor={bevelControls.edgeColor}
            edgeWidth={bevelControls.edgeWidth}
            showCutFaces={bevelControls.showCutFaces}
            cutFaceColor={bevelControls.cutFaceColor}
            cutFaceOpacity={bevelControls.cutFaceOpacity}
          />
        </Center>

        {/* 自定义地面 */}
        {backgroundControls.showGround && (
          <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[backgroundControls.groundSize, backgroundControls.groundSize]} />
            <meshStandardMaterial color={backgroundControls.groundColor} />
          </mesh>
        )}

        {/* <Shadows /> */}
        <Grid position={[0, -0.01, 0]} args={gridSize} {...gridConfig} />
      </group>

      <CameraController
        viewMode={cameraControls.viewMode}
        cameraDistance={cameraControls.cameraDistance}
        animationDuration={cameraControls.animationDuration}
        enableAnimation={cameraControls.enableAnimation}
      />

      {/* <Environment preset="city" /> */}

      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 4, 0]} intensity={1.5} />
      <pointLight position={[4, -0, 5]} intensity={0.5} />

      <GizmoHelper alignment="top-left" margin={[80, 80]}>
        <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  )
}

const Shadows = memo(() => (
  <AccumulativeShadows temporal frames={100} color="#9d4b4b" colorBlend={0.5} alphaTest={0.9} scale={20}>
    <RandomizedLight amount={8} radius={4} position={[5, 5, -10]} />
  </AccumulativeShadows>
))
